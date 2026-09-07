/**
 * MMIT Institutional Timetable A4 Landscape PDF Export Utility
 * Ensures non-empty, print-ready, high-resolution PDF download with full headers, matrix, workloads, and signatures.
 * Clean, institutional print styling is preserved in both Light and Dark themes.
 */

export async function exportTimetableToPDF(elementId: string, filename: string = 'MMIT_Timetable.pdf') {
  const container = document.getElementById(elementId);

  if (!container) {
    alert('Error: Timetable element not found for export.');
    return;
  }

  // Pre-render Validation
  if (container.innerText.trim().length === 0 || container.querySelector('table') === null) {
    alert('Error: Timetable data has not rendered yet. Please wait for the matrix to load before downloading PDF.');
    return;
  }

  try {
    // Load script tags dynamically if html2canvas/jspdf are not bundled
    await loadScriptIfNeeded('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'html2canvas');
    await loadScriptIfNeeded('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf');

    const html2canvas = (window as any).html2canvas;
    const { jsPDF } = (window as any).jspdf;

    if (!html2canvas || !jsPDF) {
      // Fallback to browser print if script loading fails
      window.print();
      return;
    }

    // Scroll to top to prevent html2canvas from cutting off the image
    const originalScrollY = window.scrollY;
    window.scrollTo(0, 0);

    // Save dark mode state and temporarily enforce clean institutional light layout for PDF capture
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
    }

    // Render high resolution canvas, forcing a wide desktop window width so columns aren't squished
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollY: 0,
      windowWidth: Math.max(1200, document.documentElement.scrollWidth),
      windowHeight: document.documentElement.scrollHeight,
      onclone: (clonedDoc: Document) => {
        const clonedRoot = clonedDoc.documentElement;
        clonedRoot.classList.remove('dark');
        const clonedArea = clonedDoc.getElementById(elementId);
        if (clonedArea) {
          clonedArea.style.backgroundColor = '#ffffff';
          clonedArea.style.color = '#000000';
          // Ensure all text elements inside are crisp and visible
          clonedArea.querySelectorAll('*').forEach((node: any) => {
            if (node.style) {
              if (node.classList.contains('text-white') || node.tagName === 'TH' && node.classList.contains('bg-[#C8102E]')) {
                node.style.color = '#ffffff';
              }
            }
          });
        }
      }
    });

    // Restore dark mode state immediately
    if (isDark) {
      document.documentElement.classList.add('dark');
    }

    // Restore scroll position
    window.scrollTo(0, originalScrollY);

    const imgData = canvas.toDataURL('image/png');

    // Create A4 Landscape PDF (297mm x 210mm) using the options object syntax
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pdfWidth = 297;
    const pdfHeight = 210;

    const margin = 8;
    const maxImgWidth = pdfWidth - (margin * 2);
    const maxImgHeight = pdfHeight - (margin * 2);
    
    let imgWidth = maxImgWidth;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Scale down further if it's too tall to fit on one page
    if (imgHeight > maxImgHeight) {
      const scaleRatio = maxImgHeight / imgHeight;
      imgHeight = imgHeight * scaleRatio;
      imgWidth = imgWidth * scaleRatio;
    }

    // Center horizontally
    const xOffset = (pdfWidth - imgWidth) / 2;

    pdf.addImage(imgData, 'PNG', xOffset, margin, imgWidth, imgHeight);

    pdf.save(filename);
  } catch (error) {
    console.error('PDF Generation error:', error);
    // Print fallback
    window.print();
  }
}

function loadScriptIfNeeded(src: string, globalName: string): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any)[globalName]) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => resolve(); // Proceed to print fallback if script blocked
    document.head.appendChild(script);
  });
}
