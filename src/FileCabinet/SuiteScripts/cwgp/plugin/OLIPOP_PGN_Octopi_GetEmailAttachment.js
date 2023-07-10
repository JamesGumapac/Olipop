/**
 * OLIPOP_PGN_Octopi_GetEmailAttachment.js
 * Author: cosy
 * Date: 09 JUN 2023
 *
 */


/**
 * Checks email and contents
 *
 * @param {email} email
 */
function process(email) {

    try{
        nlapiLogExecution('DEBUG', 'email', email);
        var strSenderEmail = email.getFrom().getEmail();
        var arrAttachments = email.getAttachments();
        var strEmailSubject = email.getSubject();
        nlapiLogExecution('DEBUG', 'Sender Email', strSenderEmail);
        nlapiLogExecution('DEBUG', 'Subject', strEmailSubject);
        nlapiLogExecution('DEBUG', 'Attachments', arrAttachments);
        var stFileName = arrAttachments[0].getName();
        var stFileType = arrAttachments[0].getType();
        var stFileContent = arrAttachments[0].getValue();
        var decodedString = Base64.decode(stFileContent)
        nlapiLogExecution('DEBUG', 'stFileName', stFileName);
        nlapiLogExecution('DEBUG', 'stFileType', stFileType);
        nlapiLogExecution('DEBUG', 'decodedString', decodedString);
        var objNewFile = nlapiCreateFile(stFileName.split('.')[0], 'CSV', decodedString);
        nlapiLogExecution('DEBUG', 'objNewFile', objNewFile);
        objNewFile.setFolder(19193);
        var intNewFileId = nlapiSubmitFile(objNewFile);
        nlapiLogExecution('DEBUG', 'intNewFileId', intNewFileId);
    }
    catch(e){
        nlapiLogExecution('ERROR', e.code || e.title || e.name, JSON.stringify(e));
    }
}