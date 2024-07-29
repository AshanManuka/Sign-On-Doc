let selectedPageCanvas = null;
let signaturePosition = { x: 0, y: 0 };

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

                        canvas.addEventListener('click', function(event) {
                            const rect = canvas.getBoundingClientRect();
                            signaturePosition.x = event.clientX - rect.left;
                            signaturePosition.y = event.clientY - rect.top;
                            selectedPageCanvas = canvas;
                        });

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

document.getElementById('saveSignature').addEventListener('click', async function() {
    if (signaturePad.isEmpty()) {
        alert('Please provide a signature first.');
        return;
    }

    if (!selectedPageCanvas) {
        alert('Please select a location on the document to place the signature.');
        return;
    }

    const signatureDataURL = signaturePad.toDataURL('image/png');
    const docContext = selectedPageCanvas.getContext('2d');
    const img = new Image();
    img.src = signatureDataURL;
    img.onload = function() {
        docContext.drawImage(img, signaturePosition.x, signaturePosition.y, 100, 50); // Adjust size as needed
        generatePdfWithSignature();
    };
});

async function generatePdfWithSignature() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    const documentCanvases = document.querySelectorAll('#documentContainer canvas');
    for (let i = 0; i < documentCanvases.length; i++) {
        const canvas = documentCanvases[i];
        const imgData = await html2canvas(canvas).then(canvas => canvas.toDataURL('image/png'));

        if (i > 0) {
            pdf.addPage();
        }
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    }

    const finalPdfUrl = pdf.output('dataurlstring');
    const downloadLink = document.getElementById('downloadLink');
    downloadLink.href = finalPdfUrl;
    downloadLink.download = 'signed_document.pdf';
    downloadLink.style.display = 'block';
    downloadLink.innerText = 'Download Signed Document';
}
