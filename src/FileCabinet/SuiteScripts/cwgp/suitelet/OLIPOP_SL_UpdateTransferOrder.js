//OLIPOP_SL_UpdateTransferOrder.js
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

/**
*  Date     : 27 February 2023
*  Author   : rmolina
* 
*  Date Modified       Modified By             Notes
*  27 February 2023   rmolina			       Initial Version
*  06 June 2023		  rmolina				   Removed Confirmation Number
*/

 var SL_OBJ = {
    MAIN : {
        ERROR       : 'custpage_cwgp_errorpage'
    },
};
 
 var LOG_NAME;

define(['N/record', 'N/runtime', 'N/search', 'N/ui/serverWidget', 'N/url', 'N/redirect', 'N/file', 'N/render', 'N/xml', '../library/OPOP_LIB_UpdateTransferOrder.js'],
/**
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 * @param {serverWidget} serverWidget
 * @param {url} url
 */
function(record, runtime, search, serverWidget, url, redirect, file, render, xml, genPR) {
   
	
    function onRequest(context) {
    	
    	var strHtml = '<p style="font-size:14px; span-top: 4px">';

		var objForm = 	serverWidget.createForm({
					title: ' ',
					hideNavBar: false
				});
		
 		var objScript = runtime.getCurrentScript();
 		var strSuiteletId = url.resolveScript({
			scriptId: objScript.id,
			deploymentId: objScript.deploymentId,
			returnExternalUrl: true,
		});
		let csPath = objScript.getParameter({
			name: genPR.SCRIPT_PARAMETERS.CLIENTSCRIPT
		});
	   	objForm.clientScriptModulePath = csPath;
		
		//objForm.clientScriptFileId = genPR.SCRIPT_PARAMETERS.CLIENTSCRIPT;
    	
    	if(context.request.method == 'GET') {
            try {
            	LOG_NAME = 'getMethod';
    	 		var strAction = context.request.parameters.action;
    	 		var intId = context.request.parameters.toid;
    	 		var intEmployeeId = context.request.parameters.empid;
    	 		log.debug (LOG_NAME, 'strAction: ' + strAction);
    	 		log.debug (LOG_NAME, 'intEmployeeId: ' + intEmployeeId);
    	 		
    	 		if (isEmpty(strAction)){
            	//=========== Create Login Page ============//
            	var objHtmlFileIds = runtime.getCurrentScript().getParameter({name: genPR.SCRIPT_PARAMETERS.HTML_FILE_ID});
            	log.debug ('objHtmlFileIds', objHtmlFileIds);
				objHtmlFileIds = JSON.parse(objHtmlFileIds)

				var fileHtml = 	file.load({
						id: objHtmlFileIds['LANDING_PAGE']
					})

				var htmlContent = fileHtml.getContents();
            	htmlContent = htmlContent.replace(/\$employeeid_field\$/g, genPR.FORM_ELEMENTS.LOGIN_MENU.EmployeeId.ID);
            	
            	var login = objForm.addField({
            	    id : 'custpage_abc_text',
            	    type : serverWidget.FieldType.INLINEHTML,
            	    label : ' '
            	});
            	
            	login.defaultValue = htmlContent;
    	 		}
    	 		
    	 		if (strAction == 'edit'){
    	 			generateEditForm({intEmployeeId: intEmployeeId, intTOID: intId, objForm: objForm, genPR: genPR});
    	 		}

            } catch (e) {
                
                log.error(LOG_NAME, 
                    JSON.stringify({
                        "Error Code"    : e.code,
                        "Error Message" : e.message
                    })
                );
                injectErrorPage(e, context);
                return;
            }
    	}
    	
    	if(context.request.method === 'POST'){
    		LOG_NAME = 'Post';
    		var strAction =  context.request.parameters.action;
    		log.debug (LOG_NAME, 'strAction: ' + strAction);
    		var postEmployeeId = context.request.parameters[genPR.FORM_ELEMENTS.LOGIN_MENU.EmployeeId.ID]
    		var viewEmployeeId = context.request.parameters[genPR.FORM_ELEMENTS.MAIN_HEADERS.EmployeeID.ID]
    		log.debug (LOG_NAME, 'postEmployeeId' + postEmployeeId);
    		log.debug (LOG_NAME, 'viewEmployeeId' + viewEmployeeId);
    		
    		if (isEmpty(strAction)){
    		var objEmployee = confirmEmployeeId({strId: postEmployeeId});
	 		log.debug (LOG_NAME, 'objEmployee: ' + objEmployee);
	 		
    		var objHtmlFileIds = runtime.getCurrentScript().getParameter({name: genPR.SCRIPT_PARAMETERS.HTML_FILE_ID});
			objHtmlFileIds = JSON.parse(objHtmlFileIds)
			
			if(typeof objEmployee == 'string'){
	 			var strPageTitle = 'LOG-IN FAILED'
		 		strHtml += objEmployee
	 			buildFormHeader({objForm: objForm, strPageTitle: strPageTitle, strText: strHtml})
	 			//Throw Alert
	 		}
			
			else {
				var strPageTitle = 'VIEW TRANSFER ORDERS'
				buildFormHeaderView({objForm: objForm, strPageTitle: strPageTitle, strText: strHtml})
				generateTransferOrderList({strSuiteletId: strSuiteletId, intEmpId: postEmployeeId, objForm: objForm, genPR: genPR});
			}
    		}
    		
			if(strAction=='filter'){
				var FromLocation = context.request.parameters[genPR.FORM_ELEMENTS.FILTERS.FromLocation.ID]
				var ToLocation = context.request.parameters[genPR.FORM_ELEMENTS.FILTERS.ToLocation.ID]
				var PriorityLoad = context.request.parameters[genPR.FORM_ELEMENTS.FILTERS.PriorityLoad.ID]
				var Status = context.request.parameters[genPR.FORM_ELEMENTS.FILTERS.Status.ID]
				var TransferOrderID = context.request.parameters[genPR.FORM_ELEMENTS.FILTERS.TransferOrderID.ID]
				var LoadID = context.request.parameters[genPR.FORM_ELEMENTS.FILTERS.LoadID.ID]
				var Page = context.request.parameters[genPR.FORM_ELEMENTS.FILTERS.Page.ID];

				var objFilters = {
					"FromLocation"	: FromLocation,
					"ToLocation"	: ToLocation,
					"PriorityLoad"	: PriorityLoad,
					"Status"		: Status,
					"TransferOrderID" : TransferOrderID,
					"LoadID"		: LoadID,
					"Page"			: Page
				}
				var strPageTitle = 'VIEW FILTERED TRANSFER ORDERS'
				buildFormHeaderView({objForm: objForm, strPageTitle: strPageTitle, strText: strHtml})
				generateTransferOrderList({strSuiteletId: strSuiteletId, intEmpId: viewEmployeeId, objForm: objForm, genPR: genPR, objFilters: objFilters});
			}

    		if (strAction=='back'){
            	var objHtmlFileIds = runtime.getCurrentScript().getParameter({name: genPR.SCRIPT_PARAMETERS.HTML_FILE_ID});
            	log.debug ('objHtmlFileIds', objHtmlFileIds);
				objHtmlFileIds = JSON.parse(objHtmlFileIds)

				var fileHtml = 	file.load({
						id: objHtmlFileIds['LANDING_PAGE']
					})

				var htmlContent = fileHtml.getContents();
            	htmlContent = htmlContent.replace(/\$employeeid_field\$/g, genPR.FORM_ELEMENTS.LOGIN_MENU.EmployeeId.ID);
            	
            	var login = objForm.addField({
            	    id : 'custpage_abc_text',
            	    type : serverWidget.FieldType.INLINEHTML,
            	    label : ' '
            	});
            	
            	login.defaultValue = htmlContent;
			}
    		
    		if (strAction=='view'){
    			var strPageTitle = 'VIEW TRANSFER ORDERS'
    			buildFormHeaderView({objForm: objForm, strPageTitle: strPageTitle, strText: strHtml})
    			generateTransferOrderList({strSuiteletId: strSuiteletId, intEmpId: viewEmployeeId, objForm: objForm, genPR: genPR});
    		}
    		
    		if (strAction=='save'){
    			var dtPickUp = context.request.parameters[genPR.FORM_ELEMENTS.MAIN_HEADERS.PickUp.ID];
    			var dtDelivery = context.request.parameters[genPR.FORM_ELEMENTS.MAIN_HEADERS.Delivery.ID];
    			var strNotes = context.request.parameters[genPR.FORM_ELEMENTS.MAIN_HEADERS.Notes.ID];
    			var toId = context.request.parameters[genPR.FORM_ELEMENTS.MAIN_HEADERS.TransferOrderID.ID];
    			var empId =  context.request.parameters[genPR.FORM_ELEMENTS.MAIN_HEADERS.EmployeeID.ID];
    			var loadId =  context.request.parameters[genPR.FORM_ELEMENTS.MAIN_HEADERS.LoadID.ID];
    			var priorityLoad =  context.request.parameters[genPR.FORM_ELEMENTS.MAIN_HEADERS.PriorityLoad.ID];
    			var strStatus = context.request.parameters[genPR.FORM_ELEMENTS.MAIN_HEADERS.Status.ID]; 
    			updateFields({strStatus: strStatus, priorityLoad: priorityLoad, loadId: loadId, empId: empId, objForm: objForm,genPR: genPR, dtPickUp: dtPickUp, dtDelivery: dtDelivery, strNotes: strNotes, toId: toId});
    		}
    		
    		if (strAction=='bulkprint'){
    			var intItemCount = context.request.getLineCount({group: genPR.FORM_ELEMENTS.REVIEW_MENU.TransferOrderList.ID});
    			log.debug (LOG_NAME, 'intItemCount: ' + intItemCount);
        		var contents = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n";
                contents += "<pdfset>";
                var fileObj;
                var isBulkPrint = false;
    	    	for (var i=0; i < intItemCount; i++) {
    	 	    	var blMarkBuilt = context.request.getSublistValue({
    	 	    		group	: genPR.FORM_ELEMENTS.REVIEW_MENU.TransferOrderList.ID,
    				    name	: genPR.FORM_ELEMENTS.MAIN_HEADERS.ChkBox.ID,
    				    line	: i
    				});
    	        	
    	        if (blMarkBuilt == 'T'){
    	        	isBulkPrint = true;
    	        	var intPDF = context.request.getSublistValue({
    		    		group	: genPR.FORM_ELEMENTS.REVIEW_MENU.TransferOrderList.ID,
    				    name	: genPR.FORM_ELEMENTS.MAIN_HEADERS.Link.ID,
    				    line	: i
    			    });
    		    	log.debug (LOG_NAME, 'PDF ID: ' + intPDF);
    		    	
    		    	fileObj = file.load({
                        id: parseInt(intPDF)
                      });
                      var fileUrl = fileObj.url;
                      var escapedURL = xml.escape({
                          xmlText: fileUrl
                      });
                      contents += '<pdf src="https://system.netsuite.com' + escapedURL + '"></pdf>';
    	        }
    	    	}
    	    	
    	    	if (isBulkPrint){
    	    	contents += "</pdfset>";
    	    	
                var newPdfFile = render.xmlToPdf({
                   xmlString: contents 
               });
                
                context.response.writeFile(newPdfFile);}
                
                var strPageTitle = 'VIEW TRANSFER ORDERS'
            	buildFormHeaderView({objForm: objForm, strPageTitle: strPageTitle, strText: strHtml})
            	generateTransferOrderList({strSuiteletId: strSuiteletId, intEmpId: viewEmployeeId, objForm: objForm, genPR: genPR});
    		}
	 		
        	
    	}
    	
    	context.response.writePage(objForm);
    }

    return {
        onRequest: onRequest
    };
    
    function updateFields(options){
    	LOG_NAME = 'updateFields';
    	var toId = options.toId;
    	var dtPickUp = options.dtPickUp;
    	var dtDelivery = options.dtDelivery;
    	var toId = options.toId;
    	var strNotes = options.strNotes
    	var genPR = options.genPR;
    	var objFields = genPR.FORM_ELEMENTS.MAIN_HEADERS;
    	var strHtml = '<p style="font-size:14px; span-top: 4px">';
    	var objForm = options.objForm;
    	var objFieldGroup = genPR.FORM_ELEMENTS.FIELD_GROUPS;
    	var intEmployeeId = options.empId;
    	var loadId = options.loadId;
    	var strStatus = options.strStatus;
    	var priorityLoad = options.priorityLoad
    	
    	var updateRecord = record.submitFields({
    	    type: record.Type.TRANSFER_ORDER,
    	    id: parseInt(toId),
    	    values: {
    	    	'custbody_olipop_exp_pickup_date': dtPickUp,
    	    	'custbody_olipop_exp_delivery_date': dtDelivery,
    	    	'custbody_cwgp_notesto': strNotes,
    	    	'custbody_cwgp_loadid': loadId,
    	    	'custbody_cwgp_deliverystatus': strStatus,
    	    	'custbody_cwgp_priorityload': priorityLoad
    	    }
    	});
    	
    	log.debug (LOG_NAME, 'Record has been updated: ' +updateRecord);
    	
		var objHtmlFileIds = runtime.getCurrentScript().getParameter({name: genPR.SCRIPT_PARAMETERS.HTML_FILE_ID});
		objHtmlFileIds = JSON.parse(objHtmlFileIds)
		
 		var strPageTitle = 'RECORD HAS BEEN SAVED'
 		buildFormHeaderSave({objForm: objForm, strPageTitle: strPageTitle, strText: strHtml})
    	
 		objForm.addFieldGroup({
		    id : objFieldGroup.Main.ID,
		    label : objFieldGroup.Main.LABEL
    	});
    	 
   	 	var intTransferOrderId = objForm.addField({
		    id : objFields.TransferOrderID.ID,
		    type : serverWidget.FieldType[objFields.TransferOrderID.TYPE],
		    label : objFields.TransferOrderID.LABEL,
		    container : objFieldGroup.Main.ID
   	 	}).updateBreakType({
   	 		breakType: serverWidget.FieldBreakType.STARTCOL
   	 	}).updateDisplayType({
   	 		displayType: serverWidget.FieldDisplayType.INLINE
   	 	});
   	    intTransferOrderId.defaultValue = toId;
   	    
     	var empId = objForm.addField({
 		    id : objFields.EmployeeID.ID,
 		    type : serverWidget.FieldType[objFields.EmployeeID.TYPE],
 		    label : objFields.EmployeeID.LABEL,
 		    container : objFieldGroup.Main.ID
    	 }).updateBreakType({
             breakType: serverWidget.FieldBreakType.STARTCOL
         }).updateLayoutType({
    		 layoutType: serverWidget.FieldLayoutType.MIDROW
    	 }).updateDisplayType({
    		 displayType: serverWidget.FieldDisplayType.INLINE
    	 });
     	
     	empId.defaultValue = intEmployeeId;
    }
    
    function generatePackingList(options){
		 var genLib = options.genPR;
		 var intId = parseInt(options.intTOID);
		 var objParams = genLib.SCRIPT_PARAMETERS;
         var transactionFile = render.pickingTicket({
            	entityId: intId,
            	printMode: render.PrintMode.PDF,
         });
         var pickingTicket = {};
            
        transactionFile.folder = objParams.DEFAULT_FOLDER;
        transactionFile.name = intId + '.pdf';
        var pdfId = transactionFile.save();
        pickingTicket['id'] = (pdfId);
    	
    	var fileObj = file.load({
            id: pdfId
    	});
    	var fileUrl = fileObj.url;
    	fileObj.isOnline = true;
    	var fileId = fileObj.save();
    	
        pickingTicket['url'] = (fileUrl);
        log.debug ('Picking Ticket', pickingTicket);
        
        return pickingTicket;
    }
    
    function generateEditForm(options){
    	 log.debug (LOG_NAME, 'generateEditForm');
	   	 var objForm = options.objForm;
		 var genLib = options.genPR;
		 var intTOID = options.intTOID;
		 var objSearch = genLib.SAVED_SEARCH;
		 var objFieldGroup = genLib.FORM_ELEMENTS.FIELD_GROUPS;
		 var objFields = genLib.FORM_ELEMENTS.MAIN_HEADERS;
		 var objSublist = genLib.FORM_ELEMENTS.SUBLIST;
    	 var objTransferOrder = genLib.TRANSFER_ORDER;
    	 var intEmployeeId = options.intEmployeeId;
    	 
		var strPageTitle = 'EDIT TRANSFER ORDER';
		var strHtml = '<p style="font-size:14px; span-top: 4px">';
		buildFormHeaderEdit({objForm: objForm, strPageTitle: strPageTitle, strText: strHtml});

     	var strMainHeaders = search.lookupFields({
    	    type: search.Type.TRANSFER_ORDER,
    	    id: parseInt(intTOID),
    	    columns: [objTransferOrder.FIELDS.TYPE, objTransferOrder.FIELDS.SUBSIDIARY, objTransferOrder.FIELDS.TRANDATE,
    	              objTransferOrder.FIELDS.ORDERNUM, objTransferOrder.FIELDS.ROUTES, objTransferOrder.FIELDS.FROMLOCATION,
    	              objTransferOrder.FIELDS.TOLOCATION, objTransferOrder.FIELDS.PICKUPDATE, objTransferOrder.FIELDS.DELIVERYDATE,
    	              objTransferOrder.FIELDS.POCOUNT, objTransferOrder.FIELDS.FIRMED,objTransferOrder.FIELDS.USEITEMCOST,
    	              objTransferOrder.FIELDS.ORDERCOUNT, objTransferOrder.FIELDS.MFG, objTransferOrder.FIELDS.SHIPWEIGHT,
    	              objTransferOrder.FIELDS.QUANTITY, objTransferOrder.FIELDS.SHIPTEMP, objTransferOrder.FIELDS.STORAGETEMP,
    	              objTransferOrder.FIELDS.PRIORITYLOAD, objTransferOrder.FIELDS.CARRIER, objTransferOrder.FIELDS.PALLETS,
    	              objTransferOrder.FIELDS.DIMENSION, objTransferOrder.FIELDS.STATUS, objTransferOrder.FIELDS.LOADID,
    	              objTransferOrder.FIELDS.MEMO, objTransferOrder.FIELDS.CONFIRMATION]
    	});
    	
     	log.debug (LOG_NAME, 'Subsidiary: ' + strMainHeaders[objTransferOrder.FIELDS.SUBSIDIARY][0].text);
    	log.debug (LOG_NAME, strMainHeaders);

    	objForm.addFieldGroup({
		    id : objFieldGroup.Main.ID,
		    label : objFieldGroup.Main.LABEL
    	});
    	 
   	 	var intTransferOrderId = objForm.addField({
		    id : objFields.TransferOrderID.ID,
		    type : serverWidget.FieldType[objFields.TransferOrderID.TYPE],
		    label : objFields.TransferOrderID.LABEL,
		    container : objFieldGroup.Main.ID
   	 	}).updateBreakType({
   	 		breakType: serverWidget.FieldBreakType.STARTCOL
   	 	}).updateDisplayType({
   	 		displayType: serverWidget.FieldDisplayType.INLINE
   	 	});
   	    intTransferOrderId.defaultValue = intTOID;
   	    
     	var empId = objForm.addField({
 		    id : objFields.EmployeeID.ID,
 		    type : serverWidget.FieldType[objFields.EmployeeID.TYPE],
 		    label : objFields.EmployeeID.LABEL,
 		    container : objFieldGroup.Main.ID
    	 }).updateBreakType({
             breakType: serverWidget.FieldBreakType.STARTCOL
         }).updateLayoutType({
    		 layoutType: serverWidget.FieldLayoutType.MIDROW
    	 }).updateDisplayType({
    		 displayType: serverWidget.FieldDisplayType.INLINE
    	 });
     	
     	empId.defaultValue = intEmployeeId;
   	 	
     	
    	objForm.addFieldGroup({
		    id : objFieldGroup.PrimaryInformation.ID,
		    label : objFieldGroup.PrimaryInformation.LABEL
    	});

    	 var strSubsidiary = objForm.addField({
    		    id : objFields.Subsidiary.ID,
    		    type : serverWidget.FieldType[objFields.Subsidiary.TYPE],
    		    label : objFields.Subsidiary.LABEL,
    		    container : objFieldGroup.PrimaryInformation.ID
    	}).updateBreakType({
            breakType: serverWidget.FieldBreakType.STARTCOL
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.INLINE
        });
    	strSubsidiary.defaultValue = strMainHeaders[objTransferOrder.FIELDS.SUBSIDIARY][0].text || ''
    	
    	log.debug (LOG_NAME, 'Set Type Value');
    	var strType = objForm.addField({
    		    id : objFields.Type.ID,
    		    type : serverWidget.FieldType[objFields.Type.TYPE],
    		    label : objFields.Type.LABEL,
    		    container : objFieldGroup.PrimaryInformation.ID
       	 }).updateDisplayType({
       		 displayType: serverWidget.FieldDisplayType.INLINE
       	 });
    	strType.defaultValue = strMainHeaders[objTransferOrder.FIELDS.TYPE][0].text || ''

    	log.debug (LOG_NAME, 'Set Order Value');
    	var strOrder = objForm.addField({
  		    id : objFields.DocNumber.ID,
  		    type : serverWidget.FieldType[objFields.DocNumber.TYPE],
  		    label : objFields.DocNumber.LABEL,
  		    container : objFieldGroup.PrimaryInformation.ID
     	 }).updateDisplayType({
     		 displayType: serverWidget.FieldDisplayType.INLINE
     	 });
    	strOrder.defaultValue = strMainHeaders[objTransferOrder.FIELDS.ORDERNUM] || ''
    	
    	log.debug (LOG_NAME, 'Set Transdate Value');
    	var strTransDate = objForm.addField({
		    id : objFields.TransDate.ID,
		    type : serverWidget.FieldType[objFields.TransDate.TYPE],
		    label : objFields.TransDate.LABEL,
		    container : objFieldGroup.PrimaryInformation.ID
    	}).updateDisplayType({
   		 displayType: serverWidget.FieldDisplayType.INLINE
    	});
    	strTransDate.defaultValue = strMainHeaders[objTransferOrder.FIELDS.TRANDATE] || ''
    	
    	log.debug (LOG_NAME, 'Set Route Value');
     	var strRoute = objForm.addField({
 		    id : objFields.Routes.ID,
 		    type : serverWidget.FieldType[objFields.Routes.TYPE],
 		    label : objFields.Routes.LABEL,
 		    container : objFieldGroup.PrimaryInformation.ID
    	 }).updateBreakType({
             breakType: serverWidget.FieldBreakType.STARTCOL
         }).updateLayoutType({
    		 layoutType: serverWidget.FieldLayoutType.MIDROW
    	 }).updateDisplayType({
    		 displayType: serverWidget.FieldDisplayType.INLINE
    	 });
     	if (!isEmpty(strMainHeaders[objTransferOrder.FIELDS.ROUTES])){
     	strRoute.defaultValue = strMainHeaders[objTransferOrder.FIELDS.ROUTES][0].text}
     	
    	log.debug (LOG_NAME, 'Set From Location Value');
     	var strFromLocation = objForm.addField({
 		    id : objFields.FromLocation.ID,
 		    type : serverWidget.FieldType[objFields.FromLocation.TYPE],
 		    label : objFields.FromLocation.LABEL,
 		    container : objFieldGroup.PrimaryInformation.ID
    	 }).updateDisplayType({
    		 displayType: serverWidget.FieldDisplayType.INLINE
    	 });
     	if (!isEmpty(strMainHeaders[objTransferOrder.FIELDS.FROMLOCATION])){
     	strFromLocation.defaultValue = strMainHeaders[objTransferOrder.FIELDS.FROMLOCATION][0].text}
    	 
    	log.debug (LOG_NAME, 'Set To Location Value');
     	var strToLocation = objForm.addField({
 		    id : objFields.ToLocation.ID,
 		    type : serverWidget.FieldType[objFields.ToLocation.TYPE],
 		    label : objFields.ToLocation.LABEL,
 		    container : objFieldGroup.PrimaryInformation.ID
    	 }).updateDisplayType({
    		 displayType: serverWidget.FieldDisplayType.INLINE
    	 });
     	if (!isEmpty(strMainHeaders[objTransferOrder.FIELDS.TOLOCATION])){
     	strToLocation.defaultValue = strMainHeaders[objTransferOrder.FIELDS.TOLOCATION][0].text}

    	log.debug (LOG_NAME, 'Set Date Pick-Up Value');
    	 var dtPickup = objForm.addField({
  		    id : objFields.PickUp.ID,
  		    type : serverWidget.FieldType[objFields.PickUp.TYPE],
  		    label : objFields.PickUp.LABEL,
  		    container : objFieldGroup.PrimaryInformation.ID
     	 }).updateBreakType({
             breakType: serverWidget.FieldBreakType.STARTCOL
         }).updateLayoutType({
     		 layoutType: serverWidget.FieldLayoutType.ENDROW
     	 });
      	if (!isEmpty(strMainHeaders[objTransferOrder.FIELDS.PICKUPDATE])){
    	 dtPickup.defaultValue = strMainHeaders[objTransferOrder.FIELDS.PICKUPDATE]}
    	 
    	 var dtDelivery = objForm.addField({
  		    id : objFields.Delivery.ID,
  		    type : serverWidget.FieldType[objFields.Delivery.TYPE],
  		    label : objFields.Delivery.LABEL,
  		    container : objFieldGroup.PrimaryInformation.ID
     	 });
       	if (!isEmpty(strMainHeaders[objTransferOrder.FIELDS.DELIVERYDATE])){
    	dtDelivery.defaultValue = strMainHeaders[objTransferOrder.FIELDS.DELIVERYDATE]}
    	 
    	 var chkFirmed = objForm.addField({
   		    id : objFields.Firmed.ID,
   		    type : serverWidget.FieldType[objFields.Firmed.TYPE],
   		    label : objFields.Firmed.LABEL,
   		    container : objFieldGroup.PrimaryInformation.ID
      	 }).updateLayoutType({
     		 layoutType: serverWidget.FieldLayoutType.STARTROW
     	 }).updateDisplayType({
    		 displayType: serverWidget.FieldDisplayType.INLINE
    	 });
    	 if (strMainHeaders[objTransferOrder.FIELDS.FIRMED]){
    		log.debug (LOG_NAME, 'TRUE: ' + strMainHeaders[objTransferOrder.FIELDS.FIRMED])
        	 chkFirmed.defaultValue = 'T' } else {
        	log.debug (LOG_NAME, 'FALSE: ' + strMainHeaders[objTransferOrder.FIELDS.FIRMED])
        	 chkFirmed.defaultValue = 'F'}

    	 var chkItemCost = objForm.addField({
    		    id : objFields.ItemCost.ID,
    		    type : serverWidget.FieldType[objFields.ItemCost.TYPE],
    		    label : objFields.ItemCost.LABEL,
    		    container : objFieldGroup.PrimaryInformation.ID
       	 }).updateLayoutType({
     		 layoutType: serverWidget.FieldLayoutType.MIDROW
     	 }).updateDisplayType({
    		 displayType: serverWidget.FieldDisplayType.INLINE
    	 });
    	 if (strMainHeaders[objTransferOrder.FIELDS.USEITEMCOST]){
     		log.debug (LOG_NAME, 'TRUE: ' + strMainHeaders[objTransferOrder.FIELDS.USEITEMCOST])
     		chkItemCost.defaultValue = 'T' } else {
         	log.debug (LOG_NAME, 'FALSE: ' + strMainHeaders[objTransferOrder.FIELDS.USEITEMCOST])
         	chkItemCost.defaultValue = 'F'}
    	 	 
     	var strPO = objForm.addField({
   		    id : objFields.PONum.ID,
   		    type : serverWidget.FieldType[objFields.PONum.TYPE],
   		    label : objFields.PONum.LABEL,
   		    container : objFieldGroup.PrimaryInformation.ID
      	 }).updateDisplayType({
    		 displayType: serverWidget.FieldDisplayType.INLINE
    	 });
     	strPO.defaultValue = strMainHeaders[objTransferOrder.FIELDS.POCOUNT]
    	 
     	objForm.addFieldGroup({
		    id : objFieldGroup.AdditionalInformation.ID,
		    label : objFieldGroup.AdditionalInformation.LABEL
     	});
     	
     	 var intCaseCount = objForm.addField({
 		    id : objFields.CaseCount.ID,
 		    type : serverWidget.FieldType[objFields.CaseCount.TYPE],
 		    label : objFields.CaseCount.LABEL,
 		    container : objFieldGroup.AdditionalInformation.ID
     	 }).updateLayoutType({
         layoutType: serverWidget.FieldLayoutType.STARTROW
     	 }).updateBreakType({
         breakType: serverWidget.FieldBreakType.STARTCOL
     	 }).updateDisplayType({
         displayType: serverWidget.FieldDisplayType.INLINE
     	 });
     	intCaseCount.defaultValue = strMainHeaders[objTransferOrder.FIELDS.ORDERCOUNT]
     	 
     	var strMfg = objForm.addField({
		    id : objFields.MFG.ID,
		    type : serverWidget.FieldType[objFields.MFG.TYPE],
		    label : objFields.MFG.LABEL,
		    container : objFieldGroup.AdditionalInformation.ID
     	}).updateDisplayType({
   		 displayType: serverWidget.FieldDisplayType.INLINE
     	});
     	strMfg.defaultValue = strMainHeaders[objTransferOrder.FIELDS.MFG]
    	
     	var ftShipWeight = objForm.addField({
		    id : objFields.TotalShipWeight.ID,
		    type : serverWidget.FieldType[objFields.TotalShipWeight.TYPE],
		    label : objFields.TotalShipWeight.LABEL,
		    container : objFieldGroup.AdditionalInformation.ID
     	}).updateDisplayType({
   		 displayType: serverWidget.FieldDisplayType.INLINE
     	});
     	ftShipWeight.defaultValue = strMainHeaders[objTransferOrder.FIELDS.SHIPWEIGHT]
     	
     	var intTotalQuantity = objForm.addField({
		    id : objFields.TotalQuantity.ID,
		    type : serverWidget.FieldType[objFields.TotalQuantity.TYPE],
		    label : objFields.TotalQuantity.LABEL,
		    container : objFieldGroup.AdditionalInformation.ID
     	}).updateDisplayType({
   		 displayType: serverWidget.FieldDisplayType.INLINE
     	});
     	intTotalQuantity.defaultValue = strMainHeaders[objTransferOrder.FIELDS.QUANTITY]
     	
   	 	var strNotes = objForm.addField({
		    id : objFields.Notes.ID,
		    type : serverWidget.FieldType[objFields.Notes.TYPE],
		    label : objFields.Notes.LABEL,
		    container : objFieldGroup.AdditionalInformation.ID
   	 	});
   	 	strNotes.defaultValue = strMainHeaders[objTransferOrder.FIELDS.MEMO]
   	 
    	 var strShipTemp = objForm.addField({
  		    id : objFields.ShipTemp.ID,
  		    type : serverWidget.FieldType[objFields.ShipTemp.TYPE],
  		    label : objFields.ShipTemp.LABEL,
  		    container : objFieldGroup.AdditionalInformation.ID
      	 }).updateLayoutType({
          layoutType: serverWidget.FieldLayoutType.STARTROW
      	 }).updateBreakType({
          breakType: serverWidget.FieldBreakType.STARTCOL
      	 }).updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE
      	 });
    	 strShipTemp.defaultValue = strMainHeaders[objTransferOrder.FIELDS.SHIPTEMP]
    	 
    	 var strStorageTemp = objForm.addField({
 		    id : objFields.StorageTemp.ID,
 		    type : serverWidget.FieldType[objFields.StorageTemp.TYPE],
 		    label : objFields.StorageTemp.LABEL,
 		    container : objFieldGroup.AdditionalInformation.ID
      	}).updateDisplayType({
    		 displayType: serverWidget.FieldDisplayType.INLINE
      	});
    	strStorageTemp.defaultValue = strMainHeaders[objTransferOrder.FIELDS.STORAGETEMP];
    	 
    	var strPriorityLoad = objForm.addField({
  		    id : objFields.PriorityLoad.ID,
  		    type : serverWidget.FieldType[objFields.PriorityLoad.TYPE],
  		    label : objFields.PriorityLoad.LABEL,
  		    source: objFields.PriorityLoad.SOURCE,
  		    container : objFieldGroup.AdditionalInformation.ID
       	});
       	if (!isEmpty(strMainHeaders[objTransferOrder.FIELDS.PRIORITYLOAD])){
    	strPriorityLoad.defaultValue = strMainHeaders[objTransferOrder.FIELDS.PRIORITYLOAD][0].value}
    	
    	var strCarrier = objForm.addField({
  		    id : objFields.Carrier.ID,
  		    type : serverWidget.FieldType[objFields.Carrier.TYPE],
  		    label : objFields.Carrier.LABEL,
  		    container : objFieldGroup.AdditionalInformation.ID
       	}).updateDisplayType({
     		 displayType: serverWidget.FieldDisplayType.INLINE
       	});
       	if (!isEmpty(strMainHeaders[objTransferOrder.FIELDS.CARRIER])){
    	strCarrier.defaultValue = strMainHeaders[objTransferOrder.FIELDS.CARRIER][0].text}
       	
/*    	var strConfirmation = objForm.addField({
  		    id : objFields.Confirmation.ID,
  		    type : serverWidget.FieldType[objFields.Confirmation.TYPE],
  		    label : objFields.Confirmation.LABEL,
  		    container : objFieldGroup.AdditionalInformation.ID
       	}).updateDisplayType({
     		 displayType: serverWidget.FieldDisplayType.INLINE
       	});
    	
    	if (!isEmpty(strMainHeaders[objTransferOrder.FIELDS.CONFIRMATION])){
       	strConfirmation.defaultValue = strMainHeaders[objTransferOrder.FIELDS.CONFIRMATION]}*/

       	log.debug (LOG_NAME, 'Set Confirmation Number');
       	
     	var strTotalPallets = objForm.addField({
 		    id : objFields.TotalPallets.ID,
 		    type : serverWidget.FieldType[objFields.TotalPallets.TYPE],
 		    label : objFields.TotalPallets.LABEL,
 		    container : objFieldGroup.AdditionalInformation.ID
    	 }).updateBreakType({
             breakType: serverWidget.FieldBreakType.STARTCOL
         }).updateLayoutType({
    		 layoutType: serverWidget.FieldLayoutType.MIDROW
    	 }).updateDisplayType({
    		 displayType: serverWidget.FieldDisplayType.INLINE
    	 });
     	strTotalPallets.defaultValue = strMainHeaders[objTransferOrder.FIELDS.PALLETS];
    	 
    	var strPalleteDimension = objForm.addField({
  		    id : objFields.PalletDimension.ID,
  		    type : serverWidget.FieldType[objFields.PalletDimension.TYPE],
  		    label : objFields.PalletDimension.LABEL,
  		    container : objFieldGroup.AdditionalInformation.ID
       	}).updateDisplayType({
     		 displayType: serverWidget.FieldDisplayType.INLINE
       	});
    	strPalleteDimension.defaultValue = strMainHeaders[objTransferOrder.FIELDS.DIMENSION];
		
    	var strStatus = objForm.addField({
  		    id : objFields.Status.ID,
  		    type : serverWidget.FieldType[objFields.Status.TYPE],
  		    label : objFields.Status.LABEL,
  		    source: objFields.Status.SOURCE,
  		    container : objFieldGroup.AdditionalInformation.ID
       	});
       	if (!isEmpty(strMainHeaders[objTransferOrder.FIELDS.STATUS])){
    	strStatus.defaultValue = strMainHeaders[objTransferOrder.FIELDS.STATUS][0].value}
    	
    	var strLoadId = objForm.addField({
  		    id : objFields.LoadID.ID,
  		    type : serverWidget.FieldType[objFields.LoadID.TYPE],
  		    label : objFields.LoadID.LABEL,
  		    container : objFieldGroup.AdditionalInformation.ID
       	});
    	strLoadId.defaultValue = strMainHeaders[objTransferOrder.FIELDS.LOADID];
    	
    	var sublistItem = objForm.addSublist({
         id: objSublist.ITEM.ID,
         type: serverWidget.SublistType.LIST,
         label: objSublist.ITEM.LABEL
    	});
    	
    	sublistItem.addField({
            id			: objSublist.NAME.ID,
            label		: objSublist.NAME.LABEL,
            type		: serverWidget.FieldType[objSublist.NAME.TYPE],
            source		: objSublist.NAME.SOURCE,
        });
    	
    	sublistItem.addField({
            id			: objSublist.SKU.ID,
            label		: objSublist.SKU.LABEL,
            type		: serverWidget.FieldType[objSublist.SKU.TYPE]
        });
    	
    	sublistItem.addField({
            id			: objSublist.QUANTITY.ID,
            label		: objSublist.QUANTITY.LABEL,
            type		: serverWidget.FieldType[objSublist.QUANTITY.TYPE]
        });
    	
    	sublistItem.addField({
            id			: objSublist.TRANSFERPRICE.ID,
            label		: objSublist.TRANSFERPRICE.LABEL,
            type		: serverWidget.FieldType[objSublist.TRANSFERPRICE.TYPE]
        });
    	
    	sublistItem.addField({
            id			: objSublist.UOM.ID,
            label		: objSublist.UOM.LABEL,
            type		: serverWidget.FieldType[objSublist.UOM.TYPE],
            source		: objSublist.UOM.SOURCE,
        });
    	
    	sublistItem.addField({
            id			: objSublist.AMOUNT.ID,
            label		: objSublist.AMOUNT.LABEL,
            type		: serverWidget.FieldType[objSublist.AMOUNT.TYPE]
        });
    	
    	sublistItem.addField({
            id			: objSublist.DESCRIPTION.ID,
            label		: objSublist.DESCRIPTION.LABEL,
            type		: serverWidget.FieldType[objSublist.DESCRIPTION.TYPE]
        });
    	
    	sublistItem.addField({
            id			: objSublist.MFGPO.ID,
            label		: objSublist.MFGPO.LABEL,
            type		: serverWidget.FieldType[objSublist.MFGPO.TYPE]
        });
    	
    	sublistItem.addField({
            id			: objSublist.ITEMWEIGHT.ID,
            label		: objSublist.ITEMWEIGHT.LABEL,
            type		: serverWidget.FieldType[objSublist.ITEMWEIGHT.TYPE]
        });
    	
    	sublistItem.addField({
            id			: objSublist.TOTALWEIGHT.ID,
            label		: objSublist.TOTALWEIGHT.LABEL,
            type		: serverWidget.FieldType[objSublist.TOTALWEIGHT.TYPE]
        });
    	
    	sublistItem.addField({
            id			: objSublist.ESTIMATED.ID,
            label		: objSublist.ESTIMATED.LABEL,
            type		: serverWidget.FieldType[objSublist.ESTIMATED.TYPE]
        });
    	
    	sublistItem.addField({
            id			: objSublist.DIMS.ID,
            label		: objSublist.DIMS.LABEL,
            type		: serverWidget.FieldType[objSublist.DIMS.TYPE]
        });
    	
    	sublistItem.addField({
            id			: objSublist.SPECIALINSTRUCTIONS.ID,
            label		: objSublist.SPECIALINSTRUCTIONS.LABEL,
            type		: serverWidget.FieldType[objSublist.SPECIALINSTRUCTIONS.TYPE]
        });
    	
    	sublistItem.addField({
            id			: objSublist.SHORTSKU.ID,
            label		: objSublist.SHORTSKU.LABEL,
            type		: serverWidget.FieldType[objSublist.SHORTSKU.TYPE]
        });
    	
		 var ssTransactionSearch = search.load({
             id: objSearch.TransferOrderDetails
         });
		 
		 var arrFilters = ssTransactionSearch.filters;
      		arrFilters.push(search.createFilter({
      		name: objTransferOrder.FIELDS.ID,
      		operator: search.Operator.ANYOF,
      		values:  intTOID }));
      	
   	    var objValues = {};
   	    var ctr=0;
      		ssTransactionSearch.run().each(function (results){
          	var intId = results.getValue({name: objTransferOrder.FIELDS.ID})
      		var strItem = results.getText({name: objTransferOrder.SUBLISTS.FIELDS.ITEM});
            var strSku = results.getValue({name: objTransferOrder.SUBLISTS.FIELDS.SHOPIFY});
            var intQty = results.getValue({name: objTransferOrder.SUBLISTS.FIELDS.QTY});
            var ftRate = results.getValue({name: objTransferOrder.SUBLISTS.FIELDS.RATE});
            var ftUnit = results.getValue({name: objTransferOrder.SUBLISTS.FIELDS.UNITS});
            var ftAmount = results.getValue({name: objTransferOrder.SUBLISTS.FIELDS.AMOUNT});
            var strDescription = results.getValue({name: objTransferOrder.SUBLISTS.FIELDS.DESCRIPTION, join: objTransferOrder.SUBLISTS.FIELDS.ITEM});            
            var strMFG = results.getValue({name: objTransferOrder.SUBLISTS.FIELDS.MFG});
            var ftWeight = results.getValue({name: objTransferOrder.SUBLISTS.FIELDS.ITEMWEIGHT});
            var ftTotalWeight = results.getValue({name: objTransferOrder.SUBLISTS.FIELDS.TOTALWEIGHT});
            var strPallets = results.getValue({name: objTransferOrder.SUBLISTS.FIELDS.PALLETS});
            var strNotes = results.getValue({name: objTransferOrder.SUBLISTS.FIELDS.NOTES});
            var strShortSKU = results.getValue({name: objTransferOrder.SUBLISTS.FIELDS.SHORTSKU});
            
			objValues [ctr] = {
					'item' : strItem,
					'quantity': intQty,
					'sku': strSku,
					'rate': ftRate,
					'unit': ftUnit,
					'amount': ftAmount,
					'description': strDescription,
					'mfg': strMFG,
					'weight': ftWeight,
					'totalweight': ftTotalWeight,
					'pallets': strPallets,
					'notes': strNotes,
					'shortsku': strShortSKU
				}  
			ctr++;
            return true;
        });
        
        log.debug ('generateEditForm: ', objValues);
        var arrKeysValues = Object.keys(objValues);
        log.debug (LOG_NAME, 'arrKeysValues: ' + arrKeysValues);

        if(arrKeysValues.length < 0) return;

        arrKeysValues.forEach(function (id, index) {
            
        	if (!isEmpty(objValues[id].item)){
        	sublistItem.setSublistValue({
             id          : objSublist.NAME.ID,
             line		 : index,
             value		 : objValues[id].item
           });}
        	
        	if (!isEmpty(objValues[id].sku)){
            sublistItem.setSublistValue({
             id          : objSublist.SKU.ID,
             line		 : index,
             value		 : objValues[id].sku
           });}
        	
        	if (!isEmpty(objValues[id].quantity)){
            sublistItem.setSublistValue({
            id           : objSublist.QUANTITY.ID,
            line		 : index,
            value		 : objValues[id].quantity
           });}
        	
        	if (!isEmpty(objValues[id].rate)){
                sublistItem.setSublistValue({
                id           : objSublist.TRANSFERPRICE.ID,
                line		 : index,
                value		 : objValues[id].rate
           });}
        	
        	if (!isEmpty(objValues[id].unit)){
                sublistItem.setSublistValue({
                id           : objSublist.UOM.ID,
                line		 : index,
                value		 : objValues[id].unit
           });}
        	
        	if (!isEmpty(objValues[id].amount)){
                sublistItem.setSublistValue({
                id           : objSublist.AMOUNT.ID,
                line		 : index,
                value		 : objValues[id].amount
           });}
        	
        	if (!isEmpty(objValues[id].description)){
                sublistItem.setSublistValue({
                id           : objSublist.DESCRIPTION.ID,
                line		 : index,
                value		 : objValues[id].description
           });}
        	
        	if (!isEmpty(objValues[id].mfg)){
                sublistItem.setSublistValue({
                id           : objSublist.MFGPO.ID,
                line		 : index,
                value		 : objValues[id].mfg
           });}
        	
        	if (!isEmpty(objValues[id].mfg)){
                sublistItem.setSublistValue({
                id           : objSublist.MFGPO.ID,
                line		 : index,
                value		 : objValues[id].mfg
           });}
        	
        	if (!isEmpty(objValues[id].weight)){
                sublistItem.setSublistValue({
                id           : objSublist.ITEMWEIGHT.ID,
                line		 : index,
                value		 : objValues[id].weight
           });}
        	
        	if (!isEmpty(objValues[id].totalweight)){
                sublistItem.setSublistValue({
                id           : objSublist.TOTALWEIGHT.ID,
                line		 : index,
                value		 : objValues[id].totalweight
           });}
        	
        	if (!isEmpty(objValues[id].notes)){
                sublistItem.setSublistValue({
                id           : objSublist.SPECIALINSTRUCTIONS.ID,
                line		 : index,
                value		 : objValues[id].notes
           });}
        	
        	if (!isEmpty(objValues[id].shortsku)){
                sublistItem.setSublistValue({
                id           : objSublist.SHORTSKU.ID,
                line		 : index,
                value		 : objValues[id].shortsku
           });}
        });
            
    	
    }
    
    function generateTransferOrderList(options) {
		try {
    	 var objForm = options.objForm;
		 var objFilterVal = options.objFilters || '';
    	 var genLib = options.genPR;
		 var objFieldGroup = genPR.FORM_ELEMENTS.FIELD_GROUPS;
    	 var intEmpId = options.intEmpId;
    	 var strSuiteletId = options.strSuiteletId;
    	 var objID = genLib.FORM_ELEMENTS.REVIEW_MENU.TransferOrderList;
    	 var objFields = genLib.FORM_ELEMENTS.MAIN_HEADERS;
		 var objFilters = genLib.FORM_ELEMENTS.FILTERS;
    	 var objSearch = genLib.SAVED_SEARCH;
    	 var objTransferOrder = genLib.TRANSFER_ORDER;
    	 var objValues = {};
		 var objPageField;
		 var currentPage = !isEmpty(objFilterVal.Page) ? objFilterVal.Page : 0;
    	 
      	var empId = objForm.addField({
 		    id : objFields.EmployeeID.ID,
 		    type : serverWidget.FieldType[objFields.EmployeeID.TYPE],
 		    label : objFields.EmployeeID.LABEL,
    	 }).updateDisplayType({
    		 displayType: serverWidget.FieldDisplayType.HIDDEN
    	 });
     	empId.defaultValue = intEmpId;

 		objForm.addFieldGroup({
		    id : objFieldGroup.Filters.ID,
		    label : objFieldGroup.Filters.LABEL
    	});

		Object.keys(objFilters).forEach((key)=>{
			if(key !== 'Page'){
				objForm.addField({
					id : objFilters[key].ID,
					type : serverWidget.FieldType[objFilters[key].TYPE],
					label : objFilters[key].LABEL,
					source: objFilters[key].SOURCE,
					container : objFieldGroup.Filters.ID
				});
			} 
			else {
				objPageField = objForm.addField({
					id : objFilters[key].ID,
					type : serverWidget.FieldType[objFilters[key].TYPE],
					label : objFilters[key].LABEL,
					container : objFieldGroup.Filters.ID
				});
			}
			
		})
     	
    	 
    	 var sublistItem = objForm.addSublist({
             id: objID.ID,
             type: serverWidget.SublistType.LIST,
             label: objID.LABEL
         });
    	 
    	 sublistItem.addMarkAllButtons();
         
         sublistItem.addField({
             id			: objFields.ChkBox.ID,
             label		: objFields.ChkBox.LABEL,
             type		: serverWidget.FieldType[objFields.ChkBox.TYPE]
         });
    	 
    	 sublistItem.addField({
             id          : objFields.EditLink.ID,
             type        : serverWidget.FieldType[objFields.EditLink.TYPE],
             label       : objFields.EditLink.LABEL
         });
    	 
    	 sublistItem.addField({
             id          : objFields.PrintLink.ID,
             type        : serverWidget.FieldType[objFields.PrintLink.TYPE],
             label       : objFields.PrintLink.LABEL
         });
    	 
    	 sublistItem.addField({
             id          : objFields.Item.ID,
             type        : serverWidget.FieldType[objFields.Item.TYPE],
             label       : objFields.Item.LABEL
         });
    	 
    	 sublistItem.addField({
             id          : objFields.Description.ID,
             type        : serverWidget.FieldType[objFields.Description.TYPE],
             label       : objFields.Description.LABEL
         });
    	 
    	 sublistItem.addField({
             id          : objFields.Quantity.ID,
             type        : serverWidget.FieldType[objFields.Quantity.TYPE],
             label       : objFields.Quantity.LABEL
         });
    	 
		 sublistItem.addField({
			id          : objFields.FromLocation.ID,
			type        : serverWidget.FieldType[objFields.FromLocation.TYPE],
			label       : objFields.FromLocation.LABEL
		});

    	 sublistItem.addField({
             id          : objFields.Location.ID,
             type        : serverWidget.FieldType[objFields.Location.TYPE],
             label       : objFields.Location.LABEL
         });
    	 
    	 sublistItem.addField({
             id          : objFields.DocNumber.ID,
             type        : serverWidget.FieldType[objFields.DocNumber.TYPE],
             label       : objFields.DocNumber.LABEL
         });
    	 
    	 sublistItem.addField({
             id          : objFields.PickUp.ID,
             type        : serverWidget.FieldType[objFields.PickUp.TYPE],
             label       : objFields.PickUp.LABEL
         });
    	 
    	 sublistItem.addField({
             id          : objFields.Delivery.ID,
             type        : serverWidget.FieldType[objFields.Delivery.TYPE],
             label       : objFields.Delivery.LABEL
         });
    	 
    	 sublistItem.addField({
             id          : objFields.Status.ID,
             type        : serverWidget.FieldType[objFields.Carrier.TYPE],
             label       : objFields.Status.LABEL
         });
    	 
    	 sublistItem.addField({
             id          : objFields.LoadID.ID,
             type        : serverWidget.FieldType[objFields.LoadID.TYPE],
             label       : objFields.LoadID.LABEL
         });
    	 
    	 sublistItem.addField({
             id          : objFields.Notes.ID,
             type        : serverWidget.FieldType[objFields.Notes.TYPE],
             label       : objFields.Notes.LABEL
         });
    	 
    	 sublistItem.addField({
             id          : objFields.PriorityLoad.ID,
             type        : serverWidget.FieldType[objFields.Carrier.TYPE],
             label       : objFields.PriorityLoad.LABEL
         });
    	 
    	 sublistItem.addField({
             id          : objFields.Carrier.ID,
             type        : serverWidget.FieldType[objFields.Carrier.TYPE],
             label       : objFields.Carrier.LABEL
         });
    	 
    	 var strLink = sublistItem.addField({
             id          : objFields.Link.ID,
             type        : serverWidget.FieldType[objFields.Link.TYPE],
             label       : objFields.Link.LABEL
         });
    	 
    	 strLink.updateDisplayType({
    		    displayType : serverWidget.FieldDisplayType.HIDDEN
    		});
    	 
/*    	 var strConfirmation = sublistItem.addField({
             id          : objFields.Confirmation.ID,
             type        : serverWidget.FieldType[objFields.Confirmation.TYPE],
             label       : objFields.Confirmation.LABEL
         });*/
    	 
    	 
    	 var ssTransactionSearch = search.load({
             id: objSearch.TotalRequests.ID
         });
    	 
    	 var arrFilters = ssTransactionSearch.filters;
         	arrFilters.push(search.createFilter({
         		name: objTransferOrder.FIELDS.CARRIER,
         		operator: search.Operator.ANYOF,
         		values:  parseInt(intEmpId) }));

			if(!isEmpty(objFilterVal.FromLocation)){
				arrFilters.push(search.createFilter({
					name: objTransferOrder.FIELDS.LOCATION,
					operator: search.Operator.ANYOF,
					values:  objFilterVal.FromLocation }));
			}
			if(!isEmpty(objFilterVal.ToLocation)){
				arrFilters.push(search.createFilter({
					name: objTransferOrder.FIELDS.TOLOCATION,
					operator: search.Operator.ANYOF,
					values:  objFilterVal.ToLocation }));
			}
			if(!isEmpty(objFilterVal.PriorityLoad)){
				arrFilters.push(search.createFilter({
					name: objTransferOrder.FIELDS.PRIORITYLOAD,
					operator: search.Operator.ANYOF,
					values:  objFilterVal.PriorityLoad }));
			}
			if(!isEmpty(objFilterVal.Status)){
				arrFilters.push(search.createFilter({
					name: objTransferOrder.FIELDS.STATUS,
					operator: search.Operator.ANYOF,
					values:  objFilterVal.Status }));
			}
			if(!isEmpty(objFilterVal.Status)){
				arrFilters.push(search.createFilter({
					name: objTransferOrder.FIELDS.STATUS,
					operator: search.Operator.ANYOF,
					values:  objFilterVal.Status }));
			}
			if(!isEmpty(objFilterVal.TransferOrderID)){
				arrFilters.push(search.createFilter({
					name: objTransferOrder.FIELDS.ORDERNUM,
					operator: search.Operator.HASKEYWORDS,
					values:  objFilterVal.TransferOrderID }));
			}
			log.debug('objFilters2.LoadID', objFilterVal.LoadID);
			if(!isEmpty(objFilterVal.LoadID)){
				arrFilters.push(search.createFilter({
					name: objTransferOrder.FIELDS.LOADID,
					operator: search.Operator.CONTAINS,
					values:  objFilterVal.LoadID }));
			}
				 
			log.debug("ssTransactionSearch.filters", ssTransactionSearch.filters);
			let objSearchRes = ssTransactionSearch.runPaged({
                pageSize: 10
            });
		 	var searchCount = objSearchRes.count;
			log.debug('searchCount', searchCount)
			var i = 0;
			objScript = runtime.getCurrentScript();
			if (searchCount > 0){
				 
				var numPages = Math.ceil(searchCount/10);
				currentPage = currentPage >= numPages ? 0 : currentPage;
				for (var i=0; i<numPages; i++) {
					
					if (i == currentPage) {
						objPageField.addSelectOption({
							value : i,
							text : i+1,
							isSelected : true
						});
					} else {
						objPageField.addSelectOption({
							value : i,
							text : i+1
						});
					}
				}

				
				let page = objSearchRes.fetch({
                    index: currentPage
                });
				page.data.forEach(function (results){
				// ssTransactionSearch.run().each(function (results){
					
					var intId = results.getText({name: objTransferOrder.FIELDS.ID, summary: 'GROUP'});
					var intItem = results.getValue({name: objTransferOrder.SUBLISTS.FIELDS.SHORT_CODE, join: 'item', summary: 'MAX'});
					var intQty = results.getValue({name: objTransferOrder.SUBLISTS.FIELDS.QTY, summary: 'MAX'});
					var strFromLocation = results.getValue(results.columns[14]);
					var strLocation = results.getText({name: objTransferOrder.FIELDS.TOLOCATION, summary: 'GROUP'});
					var strDocId = results.getValue({name: objTransferOrder.FIELDS.ORDERNUM, summary: 'GROUP'});
					var dtPickup = results.getValue({name: objTransferOrder.FIELDS.PICKUPDATE, summary: 'GROUP'});
					var dtDelivery = results.getValue({name: objTransferOrder.FIELDS.DELIVERYDATE, summary: 'GROUP'});
					var strStatus = results.getText({name: objTransferOrder.FIELDS.STATUS, summary: 'GROUP'});
					var strMemo = results.getValue({name: objTransferOrder.FIELDS.MEMO, summary: 'GROUP'});
					var intLoad = results.getValue({name: objTransferOrder.FIELDS.LOADID, summary: 'GROUP'});
					var intPriority = results.getText({name: objTransferOrder.FIELDS.PRIORITYLOAD, summary: 'GROUP'});
					var strCarrier = results.getText({name: objTransferOrder.FIELDS.CARRIER, summary: 'GROUP'});
					var strDescription = results.getValue ({name: objTransferOrder.SUBLISTS.FIELDS.SALESDESCRIPTION,
						join: objTransferOrder.SUBLISTS.ID, summary: 'GROUP'});
					var strConfirmation = results.getValue ({name: objTransferOrder.SUBLISTS.FIELDS.CONFIRMATION, summary: 'GROUP'});
					var intLineId = results.getValue({name: objTransferOrder.SUBLISTS.FIELDS.LINE, summary: 'MAX'});
					
					log.debug('intId', intId)
					log.debug('intLineId', intLineId);

					if(!objValues[intId]){
						objValues[intId] = {};
					}
					objValues[intId][intLineId]={
						
							'item' : intItem,
							'quantity': intQty,
							'fromLocation': strFromLocation,
							'tolocation': strLocation,
							'docnumber': strDocId,
							'pickup': dtPickup,
							'delivery': dtDelivery,
							'status': strStatus,
							'memo': strMemo,
							'load': intLoad,
							'carrier': strCarrier,
							'priorityload': intPriority,
							'description': strDescription,
							'confirmation' : strConfirmation
						
					}
					
					return true;
				});
				
				Object.keys(objValues).forEach((intId)=>{
					var shipmentFile = generatePackingList({intTOID: intId, genPR: genPR});
					// log.debug ('Shipment File', shipmentFile)
					var strEdit = '<a href='+strSuiteletId + '&action=edit&toid=' + intId + '&empid=' + intEmpId +'>Edit</a>'
					var strPrint = '<a href = '+shipmentFile.url+"'"+ ' target="_blank">' + 'Print </a>'
					
					// log.debug (LOG_NAME, 'strEdit: ' + strEdit);
					// log.debug (LOG_NAME, 'strPrint: ' + strPrint);
					objValues[intId]['edit'] = strEdit;
					objValues[intId]['print'] = strPrint;
					objValues[intId]['link'] = shipmentFile.id;
					
				});

				log.debug (LOG_NAME + 'objValues', objValues);
				let index = 0;
				Object.keys(objValues).forEach(function (id) {
					log.audit('Governance: ' + objScript.getRemainingUsage(), id);
					var arrKeysValues = Object.keys(objValues[id]);
					//log.debug (LOG_NAME, 'arrKeysValues: ' + arrKeysValues);
					
					var objTORec = objValues[id];
					log.debug('objTORec: ' + id , objTORec);
					// log.debug('arrKeysValues', arrKeysValues);
					if(arrKeysValues.length < 0) return;
					

					arrKeysValues.forEach(function (lineId){
						log.debug('lineId', lineId)
						if(lineId == 'edit' || lineId == 'print' || lineId == 'link') return;
						sublistItem.setSublistValue({
							id          : objFields.EditLink.ID,
							line		 : index,
							value		 :objTORec.edit
						});
						
						sublistItem.setSublistValue({
							id          : objFields.PrintLink.ID,
							line		 : index,
							value		 : objTORec.print
						});
						
						sublistItem.setSublistValue({
							id          : objFields.Link.ID,
							line		 : index,
							value		 : objTORec.link
						});
					
						if (!isEmpty(objTORec[lineId].item)){
						sublistItem.setSublistValue({
							id          : objFields.Item.ID,
							line		 : index,
							value		 : objTORec[lineId].item
						});}
						
					if (!isEmpty(objTORec[lineId].quantity)){
						sublistItem.setSublistValue({
						id         	 : objFields.Quantity.ID,
						line		 : index,
						value		 : objTORec[lineId].quantity
					});}
						
						if (!isEmpty(objTORec[lineId].description)){
						sublistItem.setSublistValue({
						id           : objFields.Description.ID,
						line		 : index,
						value		 : objTORec[lineId].description
					});}
					
					if (!isEmpty(objTORec[lineId].fromLocation)){
					sublistItem.setSublistValue({
						id           : objFields.FromLocation.ID,
						line		 : index,
						value		 : objTORec[lineId].fromLocation
					});}
		
						if (!isEmpty(objTORec[lineId].tolocation)){
					sublistItem.setSublistValue({
						id           : objFields.Location.ID,
						line		 : index,
						value		 : objTORec[lineId].tolocation
					});}
					
						if (!isEmpty(objTORec[lineId].docnumber)){
					sublistItem.setSublistValue({
						id           : objFields.DocNumber.ID,
						line		 : index,
						value		 : objTORec[lineId].docnumber
					});}
					
					if (!isEmpty(objTORec[lineId].pickup)){
						sublistItem.setSublistValue({
						id           : objFields.PickUp.ID,
						line		 : index,
						value		 : objTORec[lineId].pickup
					});
					}
					
					if (!isEmpty(objTORec[lineId].delivery)){
						sublistItem.setSublistValue({
						id           : objFields.Delivery.ID,
						line		 : index,
						value		 : objTORec[lineId].delivery
					});}
					
					if (!isEmpty(objTORec[lineId].status)){
						sublistItem.setSublistValue({
						id          : objFields.Status.ID,
						line		 : index,
						value		 : objTORec[lineId].status
					});}
					
					if (!isEmpty(objTORec[lineId].load)){
						sublistItem.setSublistValue({
						id           : objFields.LoadID.ID,
						line		 : index,
						value		 : objTORec[lineId].load
					});
					}
					
					if (!isEmpty(objTORec[lineId].memo)){
						sublistItem.setSublistValue({
						id          : objFields.Notes.ID,
						line		 : index,
						value		 : objTORec[lineId].memo
					});
					}
					
					if (!isEmpty(objTORec[lineId].priorityload)){
						sublistItem.setSublistValue({
						id         	 : objFields.PriorityLoad.ID,
						line		 : index,
						value		 : objTORec[lineId].priorityload
					});
					}
					
					if (!isEmpty(objTORec[lineId].carrier)){
						sublistItem.setSublistValue({
						id          : objFields.Carrier.ID,
						line		 : index,
						value		 : objTORec[lineId].carrier
					});
					}
					
					if (!isEmpty(objTORec[lineId].confirmation)){
							sublistItem.setSublistValue({
							id         	 : objFields.Confirmation.ID,
							line		 : index,
							value		 : objTORec[lineId].confirmation
						});
						}
						index++;
						})
				
					
				});
			}	
		} catch (error) {
			log.error("Error Message", error.message);
		}
    }
    
    function getEmployeeRecord(options){
		var strId = options.internalid
		var recEmployee = null;

		try{
			recEmployee = record.load({
				id: strId,
				type: record.Type.EMPLOYEE
			})
		}
		catch(e){
			if(e.name === 'RCRD_DSNT_EXIST'){
			}
			log.error(e.name, e)
			return null;
		}
		return recEmployee;

	}
    
    function confirmEmployeeId(options){
		var strId = options.strId;
		try{
			var recEmployee = getEmployeeRecord({internalid: strId})
		}
		catch(e){
			log.error('Failed to load Employee record', e)
			recEmployee = ''
		}

		if(recEmployee == undefined || recEmployee == null || recEmployee == ''){

			var objScript = runtime.getCurrentScript();
			var strSuiteletId = url.resolveScript({
									scriptId: objScript.id,
									deploymentId: objScript.deploymentId,
									returnExternalUrl: true,
								});
			return '<b>ERROR</b>: Input is invalid or does not match an existing employee. Click the button to retry.';
		}
		else{
			return recEmployee;
		}
	}
    
	function buildFormHeader(options){
		try{
			var form = options.objForm;
			var strPageTitle = options.strPageTitle;
			var strText = options.strText;
			var fldHtmlHeader = form.addField({
        	    id : 'custpage_abc_text',
        	    type : serverWidget.FieldType.INLINEHTML,
        	    label : ' '
        	});

			var objHtmlFileIds = runtime.getCurrentScript().getParameter({name: genPR.SCRIPT_PARAMETERS.HTML_FILE_ID})
			objHtmlFileIds = JSON.parse(objHtmlFileIds)

			var fileHtml = 	file.load({
					id: objHtmlFileIds['HEADER_LOGO']
				})

			var htmlContent = fileHtml.getContents();

			htmlContent = htmlContent.replace(/\$title\$/g, strPageTitle);
			
			fldHtmlHeader.defaultValue = htmlContent += strText;
			
		}catch(e){
			log.error('Build Form Header Error', e)
		}
	}
	
	function buildFormHeaderSave(options){
		try{
			var form = options.objForm;
			var strPageTitle = options.strPageTitle;
			var strText = options.strText;
			var fldHtmlHeader = form.addField({
        	    id : 'custpage_abc_text',
        	    type : serverWidget.FieldType.INLINEHTML,
        	    label : ' '
        	});

			var objHtmlFileIds = runtime.getCurrentScript().getParameter({name: genPR.SCRIPT_PARAMETERS.HTML_FILE_ID})
			objHtmlFileIds = JSON.parse(objHtmlFileIds)

			var fileHtml = 	file.load({
					id: objHtmlFileIds['SAVE_HEADER']
				})

			var htmlContent = fileHtml.getContents();

			htmlContent = htmlContent.replace(/\$title\$/g, strPageTitle);
			
			fldHtmlHeader.defaultValue = htmlContent += strText;
			fldHtmlHeader.updateLayoutType({
		          layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
		      	 }).updateBreakType({
		      	    breakType : serverWidget.FieldBreakType.STARTROW
		      	});
			
		}catch(e){
			log.error('Build Form Header Error', e)
		}
	}
	
	function buildFormHeaderView(options){
		try{
			var form = options.objForm;
			var strPageTitle = options.strPageTitle;
			var strText = options.strText;
			var fldHtmlHeader = form.addField({
        	    id : 'custpage_abc_text',
        	    type : serverWidget.FieldType.INLINEHTML,
        	    label : ' '
        	});

			var objHtmlFileIds = runtime.getCurrentScript().getParameter({name: genPR.SCRIPT_PARAMETERS.HTML_FILE_ID})
			objHtmlFileIds = JSON.parse(objHtmlFileIds)

			var fileHtml = 	file.load({
					id: objHtmlFileIds['VIEW_HEADER']
				})

			var htmlContent = fileHtml.getContents();

			htmlContent = htmlContent.replace(/\$title\$/g, strPageTitle);
			
			fldHtmlHeader.defaultValue = htmlContent += strText;
			fldHtmlHeader.updateLayoutType({
		          layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
		      	 }).updateBreakType({
		      	    breakType : serverWidget.FieldBreakType.STARTROW
		      	});
			
		}catch(e){
			log.error('Build Form Header Error', e)
		}
	}
	
	function buildFormHeaderEdit(options){
		try{
			var form = options.objForm;
			var strPageTitle = options.strPageTitle;
			var strText = options.strText;
			var fldHtmlHeader = form.addField({
        	    id : 'custpage_abc_text',
        	    type : serverWidget.FieldType.INLINEHTML,
        	    label : ' '
        	});

			var objHtmlFileIds = runtime.getCurrentScript().getParameter({name: genPR.SCRIPT_PARAMETERS.HTML_FILE_ID})
			objHtmlFileIds = JSON.parse(objHtmlFileIds)

			var fileHtml = 	file.load({
					id: objHtmlFileIds['EDIT_HEADER']
				})

			var htmlContent = fileHtml.getContents();

			fldHtmlHeader.defaultValue = htmlContent += strText;
			fldHtmlHeader.updateLayoutType({
		          layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
		      	 }).updateBreakType({
		      	    breakType : serverWidget.FieldBreakType.STARTROW
		      	});
			
		}catch(e){
			log.error('Build Form Header Error', e)
		}
	}
	
	function createNavigationElements(options){
		var form = options.form
		var intEmployeeId = options.employeeid
		var strPageTitle = options.strPageTitle
		
		buildFormHeader({objForm: form, strPageTitle: strPageTitle});
	}
	
	function isEmpty(stValue) {
        try {
            return ((stValue === '' || stValue == null || stValue == undefined) ||
                (stValue.constructor === Array && stValue.length == 0) ||
                (stValue.constructor === Object && (function(v) { for (var k in v) return false; return true; })(stValue)));
        } catch (e) {
            return true;
        }
    }
	
    
    function injectErrorPage(e, context){
        var form = serverWidget.createForm({
                title       : 'Unexpected Error',
                hideNavBar  : true
            });
        
        //INLINE HTML
        var invInlineHTML = form.addField({
            id 		: SL_OBJ.MAIN.ERROR,	 
            type 	: serverWidget.FieldType.INLINEHTML,	
            label 	: 'Template'
        });
            
        var html = 	'<!DOCTYPE html>';
            html+=  '<html lang="en">';
            html+= 		'<head>';
            html+=			'<meta charset="utf-8">';
            html+=			'<meta name="viewport" content="width=device-width, initial-scale=1">';
            html+= 			'<style type="text/css">';
            html+=				'.pt_title{display: none;}';
            html+= 			'</style>';	
            html+= 		'</head>';
            html+=		'<body>';
            html+=		'<div id="main" style="display: table; width: 100%; height: 60vh; text-align: center;">';
            html+=			'<div class="fof" style="display: table-cell; vertical-align: middle;">';
            html+=				'<h1 style="font-size: 18px;"></br>404: Unexpected Error</h1></br>';
                            if(!(e.message))
            html+=				'<h1 style="font-size: 16.5px;">' + e + '</h1></br>';
                            else
            html+=				'<h1 style="font-size: 16.5px;">' + e.message + '</h1></br>';
            html+=			'</div>';
            html+=		'</div>';
            html+= 		'</body>';
            html+= 	'</html>';
            
        invInlineHTML.defaultValue = html;
        //END OF HTML
        context.response.writePage(form);
    }
    
});
