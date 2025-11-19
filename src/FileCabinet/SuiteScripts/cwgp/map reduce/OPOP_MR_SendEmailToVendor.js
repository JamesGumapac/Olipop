//OPOP_MR_SendEmailToVendor.js

/**
*  Date     : 23 March 2023
*  Author   : rmolina
* 
*  Date Modified       Modified By             Notes
*  23 March 2023  	   rmolina			       Initial Version
*/

/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

var __CONFIG = {
		FILEID: 'custscript_cwgp_fileid',
		//cwgp > pdf files
		PDF_DIRECTORY : '86892', //PROD 
					  //'16842', //SB
}

var FIELDS = {
		VENDORID: 'custbody_cwgp_tovendor',
		TRANID 	: 'tranid',
		EMAIL	: 'email',
		SENDER	: '2046' //Propeller Accounting Employee Record
}

var arrDetails = [];
var ctr;

define(['N/email', 'N/record', 'N/search', 'N/runtime', 'N/file', 'N/render'],

function(email, record, search, runtime, file, render) {
	
	function isEmpty(value) {
		return ((value === 'none' || value === '' || value == null || value == undefined)
				|| (value.constructor === Array && value.length == 0) || (value.constructor === Object && (function(
				v) {
			for ( var k in v)
				return false;
			return true;
		})(value)));
	}

    function getInputData() {
    	log.debug ('Entering getInputData');
    	var scriptObj = runtime.getCurrentScript();
  		var sendFile = scriptObj.getParameter({name: __CONFIG.FILEID});
  		log.debug ('Extract Send Email File ID', sendFile);
  		
  		var arrVendorId = [];
  		
  		var fileRecord = file.load({
  		    id: sendFile
  		});
  		
  		var raw = JSON.parse(fileRecord.getContents());
  		
  		for (var i=0; i < raw.length; i++) {
  			var arrTransferOrder = search.lookupFields({
  			    type: search.Type.TRANSFER_ORDER,
  			    id: parseInt(raw[i]),
  			    columns: [FIELDS.VENDORID, FIELDS.TRANID]
  			});
  			
  			var strVendor = arrTransferOrder[FIELDS.VENDORID][0] || '';
  			var intVendorID = strVendor.value || '';
  			var strTranId = arrTransferOrder[FIELDS.TRANID]
  			arrVendorId.push({
  				'id': raw[i],
  				'vendorId' : intVendorID,
  				'tranid' : strTranId
  			});
  		}
  		
  		log.debug ('Transfer Order Array', arrVendorId);
  		
  		return arrVendorId;
    }

    function map(context) {
    	log.debug ('Entering Map');
    	var fileContents = JSON.parse(context.value);
		log.debug('JSON VALUES', fileContents);
		
		var pdfTransferOrder = render.pickingTicket ({
			entityId : parseInt (fileContents.id),
			printMode: render.PrintMode.PDF
		});
		
		pdfTransferOrder.folder = __CONFIG.PDF_DIRECTORY;
		pdfTransferOrder.name = fileContents.tranid + '.pdf';
        var pdfId = pdfTransferOrder.save();
        fileContents.file = pdfId;
        log.debug ('fileContents', fileContents);
        
        context.write({
			key : fileContents.id,
			value : fileContents
		});

    }

    function reduce(context) {
    	log.debug ('Entering reduce');
		var arrTransferOrder = JSON.parse(context.values[0]);
		log.debug('arrTransferOrder', arrTransferOrder);
		
		if (!isEmpty(arrTransferOrder.vendorId)){
		var vendorEmail = search.lookupFields({
			    type: search.Type.VENDOR,
			    id: parseInt(arrTransferOrder.vendorId),
			    columns: FIELDS.EMAIL
			});
		
		log.debug ('vendorEmail', vendorEmail);

		arrDetails.push ({
			'id' : arrTransferOrder.id,
			'email': vendorEmail[FIELDS.EMAIL],
			'tranid' : arrTransferOrder.tranid,
			'file' : arrTransferOrder.file
		});
		
		ctr++; 
		log.debug ('arrDetails', arrDetails); }

		 context.write ({
			key: ctr,
			value: arrDetails
		});
    }

    function summarize(summary) {
    	log.debug ('Entering summary');
    	var strTranId;
    	var strEmail;
    	var intId;
    	var intFile;
    	
		summary.output.iterator().each(function(key, value) {
			log.debug ('Value', value);
			var arrTransfer = JSON.parse(key);
			log.debug ('arrTransfer', arrTransfer);
			log.debug ('arrTransfer.value.length', arrTransfer.value.length);
			key = arrTransfer.value.length;
			log.debug ('Key', key);
			
			strTranId = arrTransfer.value[key-1].tranid;
			strEmail = arrTransfer.value[key-1].email
			intId = arrTransfer.value[key-1].id
			intFile = arrTransfer.value[key-1].file
			
			log.debug ('arrTransfer', arrTransfer);
			log.debug ('strTranId', strTranId);
			log.debug ('strEmail', strEmail);
			log.debug ('intId', intId);
			
			var transferOrderFile = render.pickingTicket ({
				entityId : parseInt (intId),
				printMode: render.PrintMode.HTML
			});
			
			var htmlbody = transferOrderFile.getContents();
			
			var fileObj = file.load ({ id: parseInt(intFile)})
			
			if (!isEmpty(strEmail)) {
			email.send({
			    author: FIELDS.SENDER,
			    recipients: strEmail,
			    subject: 'Transfer Order: ' + strTranId,
			    body: htmlbody,
			    attachments: [fileObj], 
			    relatedRecords: {
			           entityId: strEmail}
			});
			
			log.debug ('Message has been sent!'); }
			
			return true;
		});

    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
