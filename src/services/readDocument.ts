export async function readModuleFile(file: File): Promise<string> {
  if (file.size > 15_000_000) throw new Error('Choose a file smaller than 15 MB.');
  if (file.type.startsWith('image/')) {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    try { return (await worker.recognize(file)).data.text; }
    finally { await worker.terminate(); }
  }
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const pdfjs = await import('pdfjs-dist');
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    if (document.numPages > 25) throw new Error('Import PDFs with 25 pages or fewer.');
    const pages: string[] = [];
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number);
      const content = await page.getTextContent();
      let text = content.items.filter((item): item is typeof item & { str: string; hasEOL: boolean } => 'str' in item)
        .map(item => `${item.str}${item.hasEOL ? '\n' : ' '}`).join('');
      if (!text.trim()) {
        const viewport = page.getViewport({ scale: 2 });
        const canvas = window.document.createElement('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Unable to read this PDF page.');
        await page.render({ canvasContext: context, canvas, viewport }).promise;
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker('eng');
        try { text = (await worker.recognize(canvas)).data.text; }
        finally { await worker.terminate(); }
      }
      pages.push(text);
    }
    return pages.join('\n');
  }
  if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) return file.text();
  throw new Error('Choose a PDF, image, or text file.');
}
