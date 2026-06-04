const ROOT_FOLDER_ID = "1E5fFWHc6oiZGkJn3kf8DKOP2e3OO5q4v";

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const data = payload.data;
    
    let result = { success: false, message: "Unknown GAS action" };

    switch(action) {
      case 'uploadFile':
        // A generic file uploader for Signatures, Thumbnails, and Receipts
        const fileUrl = saveBase64ToDrive(data.base64, data.fileName, data.subFolder);
        result = { success: true, fileUrl: fileUrl };
        break;

      case 'generatePDF':
        // Keep your existing PDF generation logic here! 
        // Just make sure it returns the URL at the end instead of writing to the 'Data' sheet.
        const pdfUrl = createQuotationPDF(data); 
        result = { success: true, pdfUrl: pdfUrl };
        break;
    }

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// --- HELPER FUNCTION ---
function saveBase64ToDrive(base64Data, fileName, subFolderName) {
  const rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
  
  // Find or create the subfolder (e.g., "Signatures", "Receipts")
  let folderIter = rootFolder.getFoldersByName(subFolderName);
  let targetFolder = folderIter.hasNext() ? folderIter.next() : rootFolder.createFolder(subFolderName);
  
  // Clean the base64 string
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const blob = Utilities.newBlob(Utilities.base64Decode(cleanBase64), 'image/png', fileName + '.png');
  
  const file = targetFolder.createFile(blob);
  
  // Set permissions so your Cloudflare proxy can view it
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  return file.getUrl();
}

// You will need to paste your existing PDF generation logic inside this function.
// IMPORTANT: The return value MUST include fileUrl, fileId, AND filename
// so the Cloudflare Worker can store them in D1 and serve via the /quote/ proxy.
//
// Expected return shape:
//   { success: true, pdfUrl: "https://drive.google.com/...", fileId: "1AbCd...", filename: "Q-xxx_2025-01-01_CustomerName.pdf" }
//   { success: false, message: "reason for failure" }
function createQuotationPDF(data) {
   // Example using your existing generatePDF() helper from the old GAS architecture:
   // const result = generatePDF(data.quotationNumber, data.customerName, data.agentName);
   // if (result.success) {
   //   return { success: true, pdfUrl: result.fileUrl, fileId: result.fileId, filename: result.filename };
   // }
   // return result;
   return { success: false, message: "PDF generation not yet implemented in code.gs" };
}