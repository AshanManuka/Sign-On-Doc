document.getElementById('document').addEventListener('change', function(event) {
    const file = event.target.files[0];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const documentContainer = document.getElementById('documentContainer');
    documentContainer.innerHTML = ''; // Clear previous content

    if (fileExtension === 'pdf') {
        const fileReader = new FileReader();
        fileReader.onload = function() {
            const typedarray = new Uint8Array(this.result);
            pdfjsLib.getDocument(typedarray).promise.then(pdf => {
                for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
                    pdf.getPage(pageNumber).then(page => {
                        const scale = 1.5;
                        const viewport = page.getViewport({ scale: scale });
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;

                        documentContainer.appendChild(canvas);

                        const renderContext = {
                            canvasContext: context,
                            viewport: viewport
                        };
                        page.render(renderContext);
                    });
                }
            });
        };
        fileReader.readAsArrayBuffer(file);
    } else if (fileExtension === 'doc' || fileExtension === 'docx') {
        const reader = new FileReader();
        reader.onload = function(event) {
            mammoth.convertToHtml({ arrayBuffer: event.target.result })
                .then(result => {
                    documentContainer.innerHTML = result.value;
                });
        };
        reader.readAsArrayBuffer(file);
    }
});

const signaturePad = new SignaturePad(document.getElementById('signaturePad'));

document.getElementById('saveSignature').addEventListener('click', function() {
    if (signaturePad.isEmpty()) {
        alert('Please provide a signature first.');
        return;
    }

    const signatureDataURL = signaturePad.toDataURL('image/png');

    const documentCanvases = document.querySelectorAll('#documentContainer canvas');
    if (documentCanvases.length > 0) {
        documentCanvases.forEach((canvas, index) => {
            const docContext = canvas.getContext('2d');
            const img = new Image();
            img.src = signatureDataURL;
            img.onload = function() {
                docContext.drawImage(img, 10, 10, 100, 50); // Adjust position and size as needed
                if (index === documentCanvases.length - 1) {
                    const finalDocumentURL = canvas.toDataURL('application/pdf');

                    const downloadLink = document.getElementById('downloadLink');
                    downloadLink.href = finalDocumentURL;
                    downloadLink.download = 'signed_document.pdf';
                    downloadLink.style.display = 'block';
                    downloadLink.innerText = 'Download Signed Document';
                }
            };
        });
    } else {
        alert('Please upload a PDF document first.');
    }
});
