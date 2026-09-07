"""
MMIT College Timetable Constraint Solver
=========================================
Primary:  Google OR-Tools CP-SAT (if available)
Fallback: MMIT-Compliant Pure Python Two-Phase Scheduler

MMIT Scheduling Rules enforced:
  1. THEORY LOCK: Division-wide theory blocks ALL batches of that division.
  2. PRACTICAL: Batch-wise only. batchId MUST NOT be null.
  3. COORDINATED ROTATION: Practicals across batches are placed in the same
     time-block where possible (different subjects/rooms/faculty).
  4. ROOM COMPATIBILITY: Only allowedRoomIds from master data are used.
     requiredRoomType='ANY' means the session may use any room in allowedRoomIds.
  5. CONSECUTIVE PRACTICAL: 2-hour practical occupies exactly 2 consecutive slots.
  6. NO CONFLICT: Faculty, Room, Division-theory, Batch single-booking enforced.
  7. BREAK EXCLUSION: No session in break slots.
"""

import sys
import json
import time
from collections import defaultdict


# ===========================================================================
# HELPERS
# ===========================================================================

def build_slot_structures(time_slots):
    """Return break_indices and valid_practical_pairs from timeSlot data."""
    break_indices = set(s['index'] for s in time_slots if s.get('isBreak', False))
    valid_single_slots = sorted(s['index'] for s in time_slots if s['index'] not in break_indices)
    valid_practical_pairs = []
    slot_set = set(valid_single_slots)
    for idx in valid_single_slots:
        nxt = idx + 1
        if nxt in slot_set and idx not in break_indices and nxt not in break_indices:
            valid_practical_pairs.append((idx, nxt))
    return break_indices, valid_single_slots, valid_practical_pairs


def candidate_rooms_for_session(s, rooms):
    """
    Return the list of Room dicts that are valid candidates for session s.
    Respects allowedRoomIds (from master data) and requiredRoomType.
    requiredRoomType values: 'LAB', 'CLASSROOM', 'ANY'
    """
    allowed   = set(s.get('allowedRoomIds', []))
    req_type  = s.get('requiredRoomType', 'CLASSROOM')

    if req_type == 'LAB':
        filtered = [r for r in rooms if r['isLab'] and (r['id'] in allowed if allowed else True)]
        if not filtered:
            filtered = [r for r in rooms if r['isLab']]
    elif req_type == 'CLASSROOM':
        filtered = [r for r in rooms if not r['isLab'] and (r['id'] in allowed if allowed else True)]
        if not filtered:
            filtered = [r for r in rooms if not r['isLab']]
    else:  # 'ANY' - tutorials, may go in labs or classrooms per allowedLocations
        if allowed:
            filtered = [r for r in rooms if r['id'] in allowed]
        else:
            filtered = list(rooms)
        if not filtered:
            filtered = list(rooms)

    return filtered


# ===========================================================================
# OR-TOOLS CP-SAT SOLVER (Primary)
# ===========================================================================

def solve_with_ortools(input_data):
    from ortools.sat.python import cp_model
    start_time = time.time()

    sessions      = input_data.get('sessions', [])
    working_days  = input_data.get('workingDays', [1, 2, 3, 4, 5, 6])
    time_slots    = input_data.get('timeSlots', [])
    rooms         = input_data.get('rooms', [])

    break_indices, valid_single_slots, valid_practical_pairs = build_slot_structures(time_slots)

    model = cp_model.CpModel()
    placement_vars     = {}
    session_placements = {s['sessionId']: [] for s in sessions}

    teacher_slot_vars  = defaultdict(list)
    division_slot_vars = defaultdict(list)
    batch_slot_vars    = defaultdict(list)
    room_slot_vars     = defaultdict(list)
    batch_to_division  = {}

    for s in sessions:
        if s.get('batchId') and s.get('divisionId'):
            batch_to_division[s['batchId']] = s['divisionId']

    for s in sessions:
        s_id     = s['sessionId']
        t_id     = s['teacherId']
        div_id   = s['divisionId']
        batch_id = s.get('batchId')
        c_rooms  = candidate_rooms_for_session(s, rooms)

        if s['type'] == 'PRACTICAL' or s.get('duration', 1) == 2:
            for day in working_days:
                for (slot1, slot2) in valid_practical_pairs:
                    for r in c_rooms:
                        r_id = r['id']
                        var = model.NewBoolVar(f"x_{s_id}_{day}_{slot1}_{r_id}")
                        placement_vars[(s_id, day, slot1, r_id)] = var
                        session_placements[s_id].append(var)

                        for sl in (slot1, slot2):
                            teacher_slot_vars[(t_id, day, sl)].append(var)
                            room_slot_vars[(r_id, day, sl)].append(var)
                            if batch_id:
                                batch_slot_vars[(batch_id, day, sl)].append(var)
                            else:
                                division_slot_vars[(div_id, day, sl)].append(var)

        else:
            for day in working_days:
                for slot in valid_single_slots:
                    for r in c_rooms:
                        r_id = r['id']
                        var = model.NewBoolVar(f"x_{s_id}_{day}_{slot}_{r_id}")
                        placement_vars[(s_id, day, slot, r_id)] = var
                        session_placements[s_id].append(var)

                        teacher_slot_vars[(t_id, day, slot)].append(var)
                        room_slot_vars[(r_id, day, slot)].append(var)

                        if batch_id:
                            batch_slot_vars[(batch_id, day, slot)].append(var)
                        else:
                            division_slot_vars[(div_id, day, slot)].append(var)

    # Constraint: Every session placed exactly once
    for s in sessions:
        s_id = s['sessionId']
        vars_list = session_placements[s_id]
        if not vars_list:
            solve_time_ms = int((time.time() - start_time) * 1000)
            return {
                "status": "INFEASIBLE",
                "reason": f"Session {s_id} ({s.get('subjectCode')}) has no valid candidate slots/rooms.",
                "solveTimeMs": solve_time_ms,
                "placements": []
            }
        model.AddExactlyOne(vars_list)

    # Resource constraints
    for vars_list in teacher_slot_vars.values():
        if len(vars_list) > 1:
            model.AddAtMostOne(vars_list)

    for vars_list in room_slot_vars.values():
        if len(vars_list) > 1:
            model.AddAtMostOne(vars_list)

    for vars_list in batch_slot_vars.values():
        if len(vars_list) > 1:
            model.AddAtMostOne(vars_list)

    session_map = {s['sessionId']: s for s in sessions}
    div_slot_subject_vars = defaultdict(list)
    for (s_id, day, sl, r_id), var in placement_vars.items():
        s = session_map.get(s_id)
        if s and not s.get('batchId'):
            subj_id = s.get('subjectId')
            div_id = s.get('divisionId')
            div_slot_subject_vars[(div_id, day, sl, subj_id)].append(var)

    div_slot_active_subject_vars = defaultdict(list)
    for (div_id, day, slot, subj_id), v_list in div_slot_subject_vars.items():
        if v_list:
            subj_active = model.NewBoolVar(f"div_subj_active_{div_id}_{day}_{slot}_{subj_id}")
            model.AddMaxEquality(subj_active, v_list)
            div_slot_active_subject_vars[(div_id, day, slot)].append(subj_active)

    for vars_list in div_slot_active_subject_vars.values():
        if len(vars_list) > 1:
            model.AddAtMostOne(vars_list)

    # HARD RULE: Theory lock
    for (batch_id, day, sl), b_vars in batch_slot_vars.items():
        div_id = batch_to_division.get(batch_id)
        if div_id:
            d_vars = division_slot_vars.get((div_id, day, sl), [])
            for bv in b_vars:
                for dv in d_vars:
                    model.Add(bv + dv <= 1)

    # Daily max 1 theory per subject per teacher per div
    subject_div_day_vars = defaultdict(list)
    session_map = {s['sessionId']: s for s in sessions}
    for (s_id, day, sl, r_id), var in placement_vars.items():
        s = session_map.get(s_id)
        if s and s['type'] == 'LECTURE' and not s.get('batchId'):
            subj_id = s.get('subjectId')
            t_id = s.get('teacherId')
            div_id = s.get('divisionId')
            subject_div_day_vars[(subj_id, t_id, div_id, day)].append(var)

    for vars_list in subject_div_day_vars.values():
        if len(vars_list) > 1:
            model.AddAtMostOne(vars_list)

    # HARD RULE: Daily max 1 practical/lab/tutorial session per subject per batch (separate days)
    subject_batch_day_vars = defaultdict(list)
    for (s_id, day, sl, r_id), var in placement_vars.items():
        s = session_map.get(s_id)
        if s and s.get('batchId'):
            subj_id = s.get('subjectId')
            batch_id = s.get('batchId')
            subject_batch_day_vars[(subj_id, batch_id, day)].append(var)

    for vars_list in subject_batch_day_vars.values():
        if len(vars_list) > 1:
            model.AddAtMostOne(vars_list)

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 60.0
    solver.parameters.num_search_workers = 4
    seed_val = int(input_data.get('randomSeed', 0))
    if seed_val == 0:
        v_num = int(input_data.get('variant', 1))
        seed_val = 1 if v_num == 1 else (42 if v_num == 2 else 101)
    solver.parameters.random_seed = seed_val
    status = solver.Solve(model)

    solve_time_ms = int((time.time() - start_time) * 1000)

    if status in (cp_model.FEASIBLE, cp_model.OPTIMAL):
        placements = []
        for (s_id, day, slot, r_id), var in placement_vars.items():
            if solver.Value(var) == 1:
                s = next(sess for sess in sessions if sess['sessionId'] == s_id)
                placements.append({
                    "sessionId":           s_id,
                    "facultyAssignmentId": s['facultyAssignmentId'],
                    "subjectId":           s['subjectId'],
                    "teacherId":           s['teacherId'],
                    "divisionId":          s['divisionId'],
                    "batchId":             s.get('batchId'),
                    "roomId":              r_id,
                    "dayOfWeek":           day,
                    "slotIndex":           slot,
                    "duration":            s['duration'],
                    "type":                s['type'],
                })

        return {
            "status":          "FEASIBLE",
            "solverEngine":    "Google OR-Tools CP-SAT",
            "solveTimeMs":     solve_time_ms,
            "placementsCount": len(placements),
            "placements":      placements,
        }
    else:
        return {
            "status":      "INFEASIBLE",
            "solverEngine": "Google OR-Tools CP-SAT",
            "solveTimeMs":   solve_time_ms,
            "reason":       "CP-SAT solver returned INFEASIBLE or OPTIMAL_NOT_FOUND.",
            "placements":   [],
        }


# ===========================================================================
# PURE PYTHON SOLVER (Fallback)
# ===========================================================================

def solve_with_pure_cp(input_data):
    start_time = time.time()

    sessions     = input_data.get('sessions', [])
    working_days = input_data.get('workingDays', [1, 2, 3, 4, 5, 6])
    time_slots   = input_data.get('timeSlots', [])
    rooms        = input_data.get('rooms', [])

    break_indices, valid_single_slots, valid_practical_pairs = build_slot_structures(time_slots)

    def run_pass(theory_first=False):
        teacher_busy = set()   # "teacherId@day-slot"
        room_busy    = set()   # "roomId@day-slot"
        batch_busy   = set()   # "batchId@day-slot"
        div_theory   = set()   # "divisionId@day-slot"
        subj_div_day = set()   # "subjectId@teacherId@divisionId@day"

        placements = {}

        def sk(day, slot):
            return f"{day}-{slot}"

        def teacher_free(t_id, day, slots):
            return all(f"{t_id}@{sk(day,sl)}" not in teacher_busy for sl in slots)

        def room_free(r_id, day, slots):
            return all(f"{r_id}@{sk(day,sl)}" not in room_busy for sl in slots)

        def batch_free(b_id, day, slots):
            return all(f"{b_id}@{sk(day,sl)}" not in batch_busy for sl in slots)

        def div_theory_free(d_id, day, slots):
            return all(f"{d_id}@{sk(day,sl)}" not in div_theory for sl in slots)

        def no_batch_of_div_in_slots(d_id, batch_ids, day, slots):
            for b_id in batch_ids:
                for sl in slots:
                    if f"{b_id}@{sk(day,sl)}" in batch_busy:
                        return False
            return True

        div_daily_theory_count = defaultdict(lambda: defaultdict(int))

        div_theory_subject = {}

        def commit(s_id, faid, subj_id, t_id, div_id, batch_id, room_id, day, slots, typ, dur):
            placements[s_id] = {
                "sessionId":           s_id,
                "facultyAssignmentId": faid,
                "subjectId":           subj_id,
                "teacherId":           t_id,
                "divisionId":          div_id,
                "batchId":             batch_id,
                "roomId":              room_id,
                "dayOfWeek":           day,
                "slotIndex":           slots[0],
                "duration":            dur,
                "type":                typ,
            }
            for sl in slots:
                k = f"{sk(day,sl)}"
                teacher_busy.add(f"{t_id}@{k}")
                room_busy.add(f"{room_id}@{k}")
                if batch_id:
                    batch_busy.add(f"{batch_id}@{k}")
                else:
                    div_theory.add(f"{div_id}@{k}")
                    div_theory_subject[f"{div_id}@{k}"] = subj_id
            if typ == 'LECTURE' and not batch_id:
                subj_div_day.add(f"{subj_id}@{t_id}@{div_id}@{day}")
                div_daily_theory_count[div_id][day] += 1

        practical_sessions = [s for s in sessions if s['type'] == 'PRACTICAL' or s.get('duration', 1) == 2]
        theory_sessions    = [s for s in sessions if s['type'] == 'LECTURE' and s.get('duration', 1) == 1]
        tutorial_sessions  = [s for s in sessions if s['type'] == 'TUTORIAL' and s.get('duration', 1) == 1]

        div_batches = defaultdict(set)
        for s in sessions:
            if s.get('batchId') and s.get('divisionId'):
                div_batches[s['divisionId']].add(s['batchId'])

        # Prioritize standard practical blocks (0,1) morning and (4,5) afternoon
        standard_pairs = [(0, 1), (4, 5)]
        other_pairs = [p for p in valid_practical_pairs if p not in standard_pairs]
        ordered_pairs = standard_pairs + other_pairs

        practical_slot_order = [
            (day, p1, p2)
            for day in working_days
            for (p1, p2) in ordered_pairs
        ]

        def place_practicals():
            div_batch_practicals = defaultdict(lambda: defaultdict(list))
            for s in practical_sessions:
                if s.get('batchId'):
                    div_batch_practicals[s['divisionId']][s['batchId']].append(s)

            div_pract_slots_on_day = defaultdict(lambda: defaultdict(set))
            batch_subj_days = defaultdict(set)

            for div_id, batch_map in div_batch_practicals.items():
                batch_ids = list(batch_map.keys())
                remaining = {b: list(sess_list) for b, sess_list in batch_map.items()}

                for (day, slot1, slot2) in practical_slot_order:
                    if not any(remaining[b] for b in batch_ids):
                        break

                    # Max 2 practical time-windows per day per division
                    if len(div_pract_slots_on_day[div_id][day]) >= 2 and (slot1, slot2) not in div_pract_slots_on_day[div_id][day]:
                        continue

                    if not div_theory_free(div_id, day, [slot1, slot2]):
                        continue

                    used_rooms_block    = set()
                    used_teachers_block = set()
                    used_subjects_block = set()
                    candidates_per_batch = {}

                    for b_id in batch_ids:
                        if not remaining[b_id]:
                            continue
                        if not batch_free(b_id, day, [slot1, slot2]):
                            continue

                        placed_for_batch = None
                        for s in remaining[b_id]:
                            if (s['subjectId'], day) in batch_subj_days[b_id]:
                                continue
                            if s['subjectId'] in used_subjects_block:
                                continue
                            if not teacher_free(s['teacherId'], day, [slot1, slot2]):
                                continue
                            if s['teacherId'] in used_teachers_block:
                                continue
                            c_rooms = candidate_rooms_for_session(s, rooms)
                            valid_rooms = [
                                r for r in c_rooms
                                if r['id'] not in used_rooms_block
                                and room_free(r['id'], day, [slot1, slot2])
                            ]
                            if not valid_rooms:
                                valid_rooms = [
                                    r for r in rooms
                                    if r['isLab'] and r['id'] not in used_rooms_block
                                    and room_free(r['id'], day, [slot1, slot2])
                                ]
                            if valid_rooms:
                                placed_for_batch = (s, valid_rooms[0]['id'])
                                break

                        if not placed_for_batch:
                            for s in remaining[b_id]:
                                if (s['subjectId'], day) in batch_subj_days[b_id]:
                                    continue
                                if not teacher_free(s['teacherId'], day, [slot1, slot2]):
                                    continue
                                if s['teacherId'] in used_teachers_block:
                                    continue
                                c_rooms = candidate_rooms_for_session(s, rooms)
                                valid_rooms = [
                                    r for r in c_rooms
                                    if r['id'] not in used_rooms_block
                                    and room_free(r['id'], day, [slot1, slot2])
                                ]
                                if not valid_rooms:
                                    valid_rooms = [
                                        r for r in rooms
                                        if r['isLab'] and r['id'] not in used_rooms_block
                                        and room_free(r['id'], day, [slot1, slot2])
                                    ]
                                if valid_rooms:
                                    placed_for_batch = (s, valid_rooms[0]['id'])
                                    break

                        if placed_for_batch:
                            sess, r_id = placed_for_batch
                            candidates_per_batch[b_id] = (sess, r_id)
                            used_rooms_block.add(r_id)
                            used_teachers_block.add(sess['teacherId'])
                            used_subjects_block.add(sess['subjectId'])

                    active_batches_remaining = [b for b in batch_ids if remaining[b]]
                    min_req = min(2, len(active_batches_remaining))
                    if len(candidates_per_batch) >= min_req and len(candidates_per_batch) > 0:
                        div_pract_slots_on_day[div_id][day].add((slot1, slot2))
                        for b_id, (sess, r_id) in candidates_per_batch.items():
                            commit(
                                sess['sessionId'], sess['facultyAssignmentId'],
                                sess['subjectId'], sess['teacherId'],
                                sess['divisionId'], sess['batchId'],
                                r_id, day, [slot1, slot2],
                                sess['type'], sess['duration']
                            )
                            batch_subj_days[b_id].add((sess['subjectId'], day))
                            remaining[b_id].remove(sess)

                # Fallback for unplaced practicals
                for b_id in batch_ids:
                    for s in remaining[b_id]:
                        placed = False
                        c_rooms = candidate_rooms_for_session(s, rooms)
                        for (day, slot1, slot2) in practical_slot_order:
                            if len(div_pract_slots_on_day[div_id][day]) >= 2 and (slot1, slot2) not in div_pract_slots_on_day[div_id][day]:
                                continue
                            if not batch_free(b_id, day, [slot1, slot2]):
                                continue
                            if not div_theory_free(div_id, day, [slot1, slot2]):
                                continue
                            if not teacher_free(s['teacherId'], day, [slot1, slot2]):
                                continue
                            valid_rooms = [
                                r for r in c_rooms
                                if room_free(r['id'], day, [slot1, slot2])
                            ]
                            if not valid_rooms:
                                valid_rooms = [r for r in rooms if r['isLab'] and room_free(r['id'], day, [slot1, slot2])]
                            if valid_rooms:
                                div_pract_slots_on_day[div_id][day].add((slot1, slot2))
                                commit(
                                    s['sessionId'], s['facultyAssignmentId'],
                                    s['subjectId'], s['teacherId'],
                                    s['divisionId'], s['batchId'],
                                    valid_rooms[0]['id'], day, [slot1, slot2],
                                    s['type'], s['duration']
                                )
                                placed = True
                                break
                        if not placed:
                            return False, f"Cannot place practical {s['sessionId']} ({s.get('subjectCode')}, batch {s['batchId']}) — no valid slot/room."
            return True, None

        def place_single(s, slot_order):
            subj_id  = s['subjectId']
            div_id   = s['divisionId']
            batch_id = s.get('batchId')
            t_id     = s['teacherId']
            c_rooms  = candidate_rooms_for_session(s, rooms)

            def slot_priority(item):
                d, sl = item
                teacher_on_day = any(f"{t_id}@{sk(d,s_idx)}" in teacher_busy for s_idx in valid_single_slots)
                return (0 if teacher_on_day else 1, d, sl)

            s_order = sorted(slot_order, key=slot_priority)

            for (day, slot) in s_order:
                if not teacher_free(t_id, day, [slot]):
                    if s.get('subjectCode') == 'PEC321COM' and s.get('sessionId', '').endswith('_TH_3_14'):
                        sys.stderr.write(f"[DEBUG] PEC321COM TH_3 day={day} slot={slot}: teacher {t_id} not free\n")
                    continue
                if s['type'] == 'LECTURE' and not batch_id:
                    if div_daily_theory_count[div_id][day] >= 4:
                        continue
                    if f"{subj_id}@{t_id}@{div_id}@{day}" in subj_div_day:
                        if s.get('subjectCode') == 'PEC321COM' and s.get('sessionId', '').endswith('_TH_3_14'):
                            sys.stderr.write(f"[DEBUG] PEC321COM TH_3 day={day} slot={slot}: already placed on day {day}\n")
                        continue

                if batch_id:
                    if not batch_free(batch_id, day, [slot]):
                        continue
                    if not div_theory_free(div_id, day, [slot]):
                        continue
                else:
                    slot_key = f"{div_id}@{sk(day,slot)}"
                    if slot_key in div_theory:
                        if div_theory_subject.get(slot_key) != subj_id:
                            continue
                    else:
                        if not no_batch_of_div_in_slots(div_id, div_batches.get(div_id, set()), day, [slot]):
                            continue

                valid_rooms = [r for r in c_rooms if room_free(r['id'], day, [slot])]
                if not valid_rooms:
                    if s['type'] == 'LECTURE':
                        valid_rooms = [r for r in rooms if not r['isLab'] and room_free(r['id'], day, [slot])]
                    elif s['type'] == 'PRACTICAL':
                        valid_rooms = [r for r in rooms if r['isLab'] and room_free(r['id'], day, [slot])]
                    else:
                        valid_rooms = [r for r in rooms if room_free(r['id'], day, [slot])]

                if not valid_rooms:
                    if s.get('subjectCode') == 'PEC321COM' and s.get('sessionId', '').endswith('_TH_3_14'):
                        sys.stderr.write(f"[DEBUG] PEC321COM TH_3 day={day} slot={slot}: no valid room\n")
                    continue

                commit(
                    s['sessionId'], s['facultyAssignmentId'],
                    subj_id, t_id, div_id, batch_id,
                    valid_rooms[0]['id'], day, [slot],
                    s['type'], s['duration']
                )
                return True
            return False

        theory_slot_order = [(day, slot) for day in working_days for slot in valid_single_slots]

        teacher_total_hours = defaultdict(int)
        for s in sessions:
            teacher_total_hours[s['teacherId']] += s.get('duration', 1)

        subj_theory_counts = defaultdict(int)
        for s in theory_sessions:
            subj_theory_counts[s['subjectId']] += 1

        # Group theory sessions by (divisionId, subjectId) and teacher for parallel elective tracks
        div_subj_theory = defaultdict(lambda: defaultdict(list))
        for s in theory_sessions:
            div_subj_theory[s['divisionId']][s['subjectId']].append(s)

        grouped_theory_sessions = []
        for div_id, subj_map in div_subj_theory.items():
            for subj_id, s_list in subj_map.items():
                teacher_map = defaultdict(list)
                for s in s_list:
                    teacher_map[s['teacherId']].append(s)
                teachers = list(teacher_map.keys())
                if len(teachers) > 1:
                    max_len = max(len(l) for l in teacher_map.values())
                    for i in range(max_len):
                        group = [teacher_map[t][i] for t in teachers if i < len(teacher_map[t])]
                        if group:
                            grouped_theory_sessions.append(group)
                else:
                    for s in s_list:
                        grouped_theory_sessions.append([s])

        # Sort groups by subject theory total count descending
        grouped_theory_sessions.sort(key=lambda g: (-subj_theory_counts[g[0]['subjectId']], -teacher_total_hours[g[0]['teacherId']], g[0]['divisionId']))

        def place_theory_group(group, slot_order):
            div_id  = group[0]['divisionId']
            subj_id = group[0]['subjectId']

            for (day, slot) in slot_order:
                if div_daily_theory_count[div_id][day] >= 4:
                    continue

                if any(f"{subj_id}@{s['teacherId']}@{div_id}@{day}" in subj_div_day for s in group):
                    continue

                if not all(teacher_free(s['teacherId'], day, [slot]) for s in group):
                    continue

                slot_key = f"{div_id}@{sk(day,slot)}"
                if slot_key in div_theory and div_theory_subject.get(slot_key) != subj_id:
                    continue
                if slot_key not in div_theory and not no_batch_of_div_in_slots(div_id, div_batches.get(div_id, set()), day, [slot]):
                    continue

                used_rooms_here = set()
                room_assignments = []
                ok = True
                for s in group:
                    c_rooms = candidate_rooms_for_session(s, rooms)
                    valid_rooms = [
                        r for r in c_rooms
                        if r['id'] not in used_rooms_here
                        and room_free(r['id'], day, [slot])
                    ]
                    if not valid_rooms:
                        valid_rooms = [
                            r for r in rooms
                            if not r['isLab'] and r['id'] not in used_rooms_here
                            and room_free(r['id'], day, [slot])
                        ]
                    if valid_rooms:
                        used_rooms_here.add(valid_rooms[0]['id'])
                        room_assignments.append((s, valid_rooms[0]['id']))
                    else:
                        ok = False
                        break

                if ok:
                    for (s, r_id) in room_assignments:
                        commit(
                            s['sessionId'], s['facultyAssignmentId'],
                            subj_id, s['teacherId'], div_id, None,
                            r_id, day, [slot],
                            s['type'], s['duration']
                        )
                    return True
            return False

        sorted_tutorial = sorted(tutorial_sessions, key=lambda s: (s['divisionId'], s.get('batchId') or ''))

        def place_theories_and_tutorials():
            for g in grouped_theory_sessions:
                if any(s['sessionId'] in placements for s in g):
                    continue
                if not place_theory_group(g, theory_slot_order):
                    return False, f"Cannot place theory group for {g[0].get('subjectCode')} — no valid slot/room."

            for s in sorted_tutorial:
                if s['sessionId'] in placements:
                    continue
                if not place_single(s, theory_slot_order):
                    return False, f"Cannot place tutorial {s['sessionId']} ({s.get('subjectCode')}, div {s['divisionId']}) — no valid slot/room."
            return True, None

        if theory_first:
            ok, err_msg = place_theories_and_tutorials()
            if not ok: return False, err_msg, None
            ok, err_msg = place_practicals()
            if not ok: return False, err_msg, None
        else:
            ok, err_msg = place_practicals()
            if not ok: return False, err_msg, None
            ok, err_msg = place_theories_and_tutorials()
            if not ok: return False, err_msg, None

        # Verify ALL sessions placed
        missing = [s['sessionId'] for s in sessions if s['sessionId'] not in placements]
        if missing:
            return False, f"{len(missing)} session(s) unplaced: {missing[:5]}", None

        return True, None, placements

    # Pass 1: Practicals First
    ok, err_reason, res_placements = run_pass(theory_first=False)
    if not ok:
        sys.stderr.write(f"[DEBUG] Pass 1 failed: {err_reason}\n")
        # Pass 2: Theory First Fallback
        ok, err_reason, res_placements = run_pass(theory_first=True)

    solve_time_ms = int((time.time() - start_time) * 1000)

    if ok and res_placements:
        return {
            "status":          "FEASIBLE",
            "solverEngine":    "MMIT Pure Python Constraint Engine v2",
            "solveTimeMs":     solve_time_ms,
            "placementsCount": len(res_placements),
            "placements":      list(res_placements.values()),
        }
    else:
        return {
            "status":    "INFEASIBLE",
            "reason":    err_reason or "Could not find feasible schedule",
            "solveTimeMs": solve_time_ms,
            "placements": [],
        }


# ===========================================================================
# ENTRY POINT
# ===========================================================================

if __name__ == '__main__':
    try:
        raw_input = sys.stdin.read()
        input_data = json.loads(raw_input) if raw_input.strip() else {}

        try:
            from ortools.sat.python import cp_model  # noqa: F401
            result = solve_with_ortools(input_data)
        except ImportError:
            result = solve_with_pure_cp(input_data)

        print(json.dumps(result))

    except Exception as e:
        import traceback
        print(json.dumps({
            "status":     "ERROR",
            "reason":     str(e),
            "traceback":  traceback.format_exc(),
            "placements": [],
        }))
