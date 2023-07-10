//OPOP_SL_TransferOrder.js
/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

/**
*  Date     : 21 March 2023
*  Author   : rmolina
* 
*  Date Modified       Modified By             Notes
*  21 March 2023  	   rmolina			       Initial Version
*  18 May 2023		   rmolina				   Add Confirmation Number Field
*/

var statusRef = {
		26 	:	'TrnfrOrd:A', //Pending Approval
		27	:	'TrnfrOrd:B', //Pending Fulfillment
		29	:	'TrnfrOrd:D', //Partially Fulfilled
		30	:	'TrnfrOrd:E' //Pending Receipt/Partially Fulfilled
		}

var SL_OBJ = {
    MAIN : {
        FORM        : 'Update Transfer Order',
        ERROR       : 'custpage_cwgp_errorpage',
        STATUS     	: {
        	NAME	:	'Deliivery Status',
        	ID		:	'custpage_cwgp_opop_status',
        	TYPE	:	'MULTISELECT',
        	SOURCE	:	'customlist_cwgp_list_deliverystatus' //Delivery Status List
        },
        TRANSTATUS  : {
        	NAME	:	'Status',
        	ID		:	'custpage_cwgp_opop_transtatus',
        	TYPE	:	'MULTISELECT',
        	SOURCE	:   '-164' //Status
        },
        CARRIER  : {
        	NAME	:	'Carrier/Logistic Partner',
        	ID		:	'custpage_cwgp_opop_carrier',
        	TYPE	:	'MULTISELECT',
        	SOURCE	:	'employee' //Carrrier List
        },
        DOCID : {
        	NAME	:	'Document Number/ID',
        	ID		:	'custpage_cwgp_opop_docnum',
        	TYPE	:	'TEXT'	//Document Number ID
        },
        FROM : {
        	NAME	:	'Date From',
        	ID		:	'custpage_cwgp_opop_dtfrom',
        	TYPE	:	'DATE' //Date From
        },
        TO : {
        	NAME	:	'Date To',
        	ID		:	'custpage_cwgp_opop_dtto',
        	TYPE	:	'DATE' //Date To
        },
        PRINTED : {
        	NAME	:	'Picking Ticket Printed',
        	ID		:	'custpage_cwgp_opop_printed',
        	TYPE	:	'CHECKBOX' //Picking Ticket Printed
        },
        SENT : {
        	NAME	:	'Picking Ticket Sent',
        	ID		:	'custpage_cwgp_opop_sent',
        	TYPE	:	'CHECKBOX' //Picking Ticket Sent
        },
        FROMLOCATION : {
        	NAME	:	'From Location',
        	ID		:	'custpage_cwgp_opop_frlocation',
        	TYPE	:	'MULTISELECT', //From Location
        	SOURCE	:	'location'
        },
        TOLOCATION : {
        	NAME	:	'To Location',
        	ID		:	'custpage_cwgp_opop_tolocation',
        	TYPE	:	'MULTISELECT', //To Location
        	SOURCE	:	'location'
        }
    },
    SUBLIST	: {
    	ID: 'itemsublist',
    	TYPE : 'LIST',
    	NAME : 'Item',
    	TO 	: {
        	NAME	:	'Internal ID',
        	ID		:	'custpage_opop_id',
        	TYPE	:	'TEXT'
    	},
    	CHECK	: {
        	NAME	:	'Mark',
        	ID		:	'custpage_opop_mark',
        	TYPE	:	'CHECKBOX'
    	},
    	DOCNUMBER	: {
        	NAME	:	'Document Number',
        	ID		:	'custpage_opop_docnumber',
        	TYPE	:	'TEXT'
    	},
    	HIDDENDOC	: {
        	NAME	:	'Document Number',
        	ID		:	'custpage_opop_hiddendoc',
        	TYPE	:	'TEXT'
    	},
    	DATE	: {
        	NAME	:	'Date',
        	ID		:	'custpage_opop_date',
        	TYPE	:	'TEXT'
    	},
    	STATUS	: {
        	NAME	:	'Status',
        	ID		:	'custpage_opop_status',
        	TYPE	:	'TEXT'
    	},
    	CARRIER	: {
        	NAME	:	'Carrier/Logistic Partner',
        	ID		:	'custpage_opop_carrier',
        	TYPE	:	'TEXT'
    	},
    	OLDDELIVERYDATE	: {
        	NAME	:	'Expected Delivery Date (Old Value)',
        	ID		:	'custpage_opop_olddeliverydate',
        	TYPE	:	'TEXT',
    	},
    	NEWDELIVERYDATE	: {
        	NAME	:	'Expected Delivery Date(New Value)',
        	ID		:	'custpage_opop_newdeliverydate',
        	TYPE	:	'TEXT'
    	},
    	OLDPICKUPDATE	: {
        	NAME	:	'Expected Pick Up Date(Old Value)',
        	ID		:	'custpage_opop_oldpickupdate',
        	TYPE	:	'TEXT',
        	NUMBER	:	'6'
    	},
    	NEWPICKUPDATE	: {
        	NAME	:	'Expected Pick Up Date(New Value)',
        	ID		:	'custpage_opop_newpickupdate',
        	TYPE	:	'TEXT'
    	},
    	OLDNOTES	: {
        	NAME	:	'Carrier Notes (Old Value)',
        	ID		:	'custpage_opop_oldnotes',
        	TYPE	:	'TEXTAREA'
    	},
    	NEWNOTES	: {
        	NAME	:	'Carrier Notes (New Value)',
        	ID		:	'custpage_opop_newnotes',
        	TYPE	:	'TEXTAREA'
    	},
    	OLDPRIORITY	: {
        	NAME	:	'Priority Load (Old Value)',
        	ID		:	'custpage_opop_oldpriority',
        	TYPE	:	'TEXT'
    	},
    	NEWPRIORITY	: {
        	NAME	:	'Priority Load (New Value)',
        	ID		:	'custpage_opop_newpriority',
        	TYPE	:	'TEXT'
    	},
    	OLDDELIVERY	: {
        	NAME	:	'Delivery Status (Old Value)',
        	ID		:	'custpage_opop_olddelivery',
        	TYPE	:	'TEXT'
    	},
    	NEWDELIVERY	: {
        	NAME	:	'Delivery Status (New Value)',
        	ID		:	'custpage_opop_newdelivery',
        	TYPE	:	'TEXT'
    	},
    	OLDLOAD	: {
        	NAME	:	'Load ID (Old Value)',
        	ID		:	'custpage_opop_oldload',
        	TYPE	:	'TEXT'
    	},
    	NEWLOAD	: {
        	NAME	:	'Load ID (New Value)',
        	ID		:	'custpage_opop_newload',
        	TYPE	:	'TEXT'
    	},
        CONFIRMATIONNO : {
        	NAME	:	'Confirmation Number',
        	ID		:	'custpage_opop_confirmation',
        	TYPE	:	'TEXT' //Confirmation Number
        },
    }
};

var __CONFIG = {
		SEARCH : {
			CARRIERLIST: 'customsearch_cwgp_toreport'	//Transfer Order Updated by Carrier
		},
		PARAMETERS : {
			HTML_ID : 'custscript_cwgp_html_fileid'
		},
		PDF_DIRECTORY : '16842', //cwgp > pdf files
		SENDEMAIL : { //OPOP | MR | Send Email to Vendor
			SCRIPTID: 'customscript_cwgp_mr_sendemailtovendor',
			DEPID: 'customdeploy_cwgp_mr_sendemailtovendor'
		},
		STATUS : { //OPOP | SL | Bulk Email Status
			SCRIPTID: 'customscript_cwgp_sl_sendemailstatus',
			DEPID: 'customdeploy_cwgp_sl_sendemailstatus'
		}
}

var FIELDS = {
		ID : {
			ID : 'internalid',
			SUMMARY : 'GROUP' },
		DELIVERY : {
			ID: 'custbody_cwgp_deliverystatus' },
		SENT : {
			ID: 'custbody_cwgp_pickingticketsent' },
		PRINTED : {
			ID: 'custbody_cwgp_pickingticketprinted' },
		CONFIRMATION : {
			ID: 'custbody_cwgp_confirmation',
			SUMMARY : 'GROUP'},
		FROMLOCATION : {
			ID : 'location' },
		TOLOCATION : {
			ID: 'transferlocation' },
		NUMBER : {
			ID: 'numbertext' },
		DOCNUMBER : {
			ID : 'tranid',
			SUMMARY : 'GROUP' },
		TRANDATE : {
			ID : 'trandate',
			SUMMARY : 'GROUP' },
		STATUS : {
			ID : 'statusref',
			REF: 'status',
			SUMMARY : 'GROUP' },
		CARRIER : {
			ID : 'custbody_cwgp_carrier',
			SUMMARY : 'GROUP' },
		OLDDELIVERY : {
			NUMBER: '7'},
		NEWDELIVERY : {
			NUMBER: '8'},
		OLDPICKUP : {
			NUMBER: '5'},
		NEWPICKUP : {
			NUMBER: '6'},
		OLDNOTES : {
			NUMBER: '9'},
		NEWNOTES : {
			NUMBER: '10'},
		OLDPRIORITY : {
			NUMBER: '11'},
		NEWPRIORITY : {
			NUMBER: '12'},
		OLDSTATUS : {
			NUMBER: '13'},
		NEWSTATUS : {
			NUMBER: '14'},
		OLDLOAD : {
			NUMBER: '15'},
		NEWLOAD : {
			NUMBER: '16'}
}
 
 var LOG_NAME;


define(['N/record', 'N/runtime', 'N/search', 'N/ui/serverWidget', 'N/url', 'N/file', 'N/render', 'N/xml', 'N/task', 'N/redirect'],
/**
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 * @param {serverWidget} serverWidget
 */
function(record, runtime, search, serverWidget, url, file, render, xml, task,redirect) {
   
    function onRequest(context) {    	
    	var objScript = runtime.getCurrentScript();
    	var strSuiteletId = url.resolveScript({
    		scriptId: objScript.id,
    		deploymentId: objScript.deploymentId,
    		returnExternalUrl: true });
    	
    	var strHtml = '<p style="font-size:14px; span-top: 4px">';
    	
        var objForm = serverWidget.createForm({
        	title: ' ',
			hideNavBar: false
        });
    	
    	if(context.request.method == 'GET') {
            try {
            	LOG_NAME = 'getMethod';        		
        		var objParams = {
                        "method"        	: context.request.method,
                        "context"       	: context,
                        "carrierlist"		: __CONFIG.SEARCH.CARRIERLIST,
                        "fields"			: FIELDS,
                        "form"				: objForm,
                        "statusref"			: statusRef
            	};
            	log.debug(LOG_NAME, 'objParams: ' + JSON.stringify(objParams));
            	var strPageTitle = 'Transfer Order Report';
            	buildFormHeaderView({objForm: objForm, strPageTitle: strPageTitle, strText: strHtml})
                generateForm(objParams);
            
            
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
    	
    	 else {
             try {
                 LOG_NAME = 'postMethod';
     	 		 var strAction = context.request.parameters.action;
         		 var strStatus = context.request.parameters[SL_OBJ.MAIN.STATUS.ID];
        	 	 var strTranStatus = context.request.parameters[SL_OBJ.MAIN.TRANSTATUS.ID];
        	   	 var strCarrier = context.request.parameters[SL_OBJ.MAIN.CARRIER.ID];
        	   	 var strFromLocation = context.request.parameters[SL_OBJ.MAIN.FROMLOCATION.ID];
        	   	 var strToLocation = context.request.parameters[SL_OBJ.MAIN.TOLOCATION.ID];
        	   	 var dtTo = context.request.parameters[SL_OBJ.MAIN.TO.ID];
        	   	 var dtFrom = context.request.parameters[SL_OBJ.MAIN.FROM.ID];
        	   	 var strId = context.request.parameters[SL_OBJ.MAIN.DOCID.ID];
        	   	 var chkPrint = context.request.parameters[SL_OBJ.MAIN.PRINTED.ID];
        	   	 var chkSent = context.request.parameters[SL_OBJ.MAIN.SENT.ID];
        		
        		log.debug ('strStatus', strStatus);
        		log.debug ('strTranStatus', strTranStatus);
        		log.debug ('strCarrier', strCarrier);
        		log.debug ('strFromLocation', strFromLocation);
        		log.debug ('strToLocation', strToLocation);
        		log.debug ('dtTo', dtTo);
        		log.debug ('dtFrom', dtFrom);
        		log.debug ('strId', strId);
        		log.debug ('chkPrint', chkPrint);
        		log.debug ('chkSent', chkSent);
        		
                 var objParams = {
                 	"method"        	: context.request.method,
                 	"context"       	: context,
                    "form"				: objForm,
                    "carrierlist"		: __CONFIG.SEARCH.CARRIERLIST,
                    "fields"			: FIELDS,
                    "action"			: strAction,
                    "status"			: strStatus,
                    "transtatus"		: strTranStatus,
                    "carrier"			: strCarrier,
                    "statusref"			: statusRef,
                    "fromlocation"		: strFromLocation,
                    "tolocation"		: strToLocation,
                    "dateTo"			: dtTo,
                    "dateFrom"			: dtFrom,
                    "docid"				: strId,
                    "printed"			: chkPrint,
                    "sent"				: chkSent
                 }
                 log.debug(LOG_NAME, 'objParams: ' + JSON.stringify(objParams));
                 var strPageTitle = 'Transfer Order Report';
             	 buildFormHeaderView({objForm: objForm, strPageTitle: strPageTitle, strText: strHtml});
                 generateForm(objParams);
                 
                 var scriptObj = runtime.getCurrentScript();
                 log.debug({
                     title: "Remaining usage units: ",
                     details: scriptObj.getRemainingUsage()
                 });
                 
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

    }
    
    function generateForm(objParams) {
        LOG_NAME = 'generateForm';
        var context = objParams.context;
   	 	var objValues = {};
   	 	var ctr = 0; //Counter for Sublist Line
   	 	var transtatusFilter = {};

        try {
        	
            var objForm = objParams.form;
            
            objForm.addField({
                id          : SL_OBJ.MAIN.STATUS.ID,
                type        : serverWidget.FieldType[SL_OBJ.MAIN.STATUS.TYPE],
                label       : SL_OBJ.MAIN.STATUS.NAME,
                source		: SL_OBJ.MAIN.STATUS.SOURCE });
            
            objForm.addField({
                id          : SL_OBJ.MAIN.TRANSTATUS.ID,
                type        : serverWidget.FieldType[SL_OBJ.MAIN.TRANSTATUS.TYPE],
                label       : SL_OBJ.MAIN.TRANSTATUS.NAME,
                source      : SL_OBJ.MAIN.TRANSTATUS.SOURCE });
            
            objForm.addField({
                id          : SL_OBJ.MAIN.CARRIER.ID,
                type        : serverWidget.FieldType[SL_OBJ.MAIN.CARRIER.TYPE],
                label       : SL_OBJ.MAIN.CARRIER.NAME,
                source		: SL_OBJ.MAIN.CARRIER.SOURCE });
            
            objForm.addField({
                id          : SL_OBJ.MAIN.FROMLOCATION.ID,
                type        : serverWidget.FieldType[SL_OBJ.MAIN.FROMLOCATION.TYPE],
                label       : SL_OBJ.MAIN.FROMLOCATION.NAME,
                source		: SL_OBJ.MAIN.FROMLOCATION.SOURCE });
            
            objForm.addField({
                id          : SL_OBJ.MAIN.TOLOCATION.ID,
                type        : serverWidget.FieldType[SL_OBJ.MAIN.TOLOCATION.TYPE],
                label       : SL_OBJ.MAIN.TOLOCATION.NAME,
                source		: SL_OBJ.MAIN.TOLOCATION.SOURCE });
            
            objForm.addField({
                id          : SL_OBJ.MAIN.DOCID.ID,
                type        : serverWidget.FieldType[SL_OBJ.MAIN.DOCID.TYPE],
                label       : SL_OBJ.MAIN.DOCID.NAME });
            
            objForm.addField({
                id          : SL_OBJ.MAIN.FROM.ID,
                type        : serverWidget.FieldType[SL_OBJ.MAIN.FROM.TYPE],
                label       : SL_OBJ.MAIN.FROM.NAME });
            
            objForm.addField({
                id          : SL_OBJ.MAIN.TO.ID,
                type        : serverWidget.FieldType[SL_OBJ.MAIN.TO.TYPE],
                label       : SL_OBJ.MAIN.TO.NAME });
            
            objForm.addField({
                id          : SL_OBJ.MAIN.PRINTED.ID,
                type        : serverWidget.FieldType[SL_OBJ.MAIN.PRINTED.TYPE],
                label       : SL_OBJ.MAIN.PRINTED.NAME });
            
            objForm.addField({
                id          : SL_OBJ.MAIN.SENT.ID,
                type        : serverWidget.FieldType[SL_OBJ.MAIN.SENT.TYPE],
                label       : SL_OBJ.MAIN.SENT.NAME });
            

        	// =============== Create Item Sublist Fields ============= //
        	var sublistItem = objForm.addSublist({
                id: SL_OBJ.SUBLIST.ID,
                type: serverWidget.SublistType[SL_OBJ.SUBLIST.TYPE],
                label: SL_OBJ.SUBLIST.NAME
           	});
        	
       	 	sublistItem.addMarkAllButtons();
        	
        	var chkMark = sublistItem.addField({
        		id 		: SL_OBJ.SUBLIST.CHECK.ID,
        		label	: SL_OBJ.SUBLIST.CHECK.NAME,
        		type	: serverWidget.FieldType[SL_OBJ.SUBLIST.CHECK.TYPE] });
        	
        	chkMark.defaultValue = false;
        	
        	sublistItem.addField({
        		id 		: SL_OBJ.SUBLIST.TO.ID,
        		label	: SL_OBJ.SUBLIST.TO.NAME,
        		type	: serverWidget.FieldType[SL_OBJ.SUBLIST.TO.TYPE] });
        	
        	sublistItem.addField({
        		id 		: SL_OBJ.SUBLIST.DOCNUMBER.ID,
        		label	: SL_OBJ.SUBLIST.DOCNUMBER.NAME,
        		type	: serverWidget.FieldType[SL_OBJ.SUBLIST.DOCNUMBER.TYPE] });
        	
        	var hiddenDoc = sublistItem.addField({
        		id 		: SL_OBJ.SUBLIST.HIDDENDOC.ID,
        		label	: SL_OBJ.SUBLIST.HIDDENDOC.NAME,
        		type	: serverWidget.FieldType[SL_OBJ.SUBLIST.HIDDENDOC.TYPE] });
        	
        	hiddenDoc.updateDisplayType({
        	    displayType : serverWidget.FieldDisplayType.HIDDEN
        	});
        	
        	sublistItem.addField({
        		id 		: SL_OBJ.SUBLIST.DATE.ID,
        		label	: SL_OBJ.SUBLIST.DATE.NAME,
        		type	: serverWidget.FieldType[SL_OBJ.SUBLIST.DATE.TYPE] });
        	
        	sublistItem.addField({
        		id 		: SL_OBJ.SUBLIST.STATUS.ID,
        		label	: SL_OBJ.SUBLIST.STATUS.NAME,
        		type	: serverWidget.FieldType[SL_OBJ.SUBLIST.STATUS.TYPE] });
        	
        	sublistItem.addField({
        		id 		: SL_OBJ.SUBLIST.CARRIER.ID,
        		label	: SL_OBJ.SUBLIST.CARRIER.NAME,
        		type	: serverWidget.FieldType[SL_OBJ.SUBLIST.CARRIER.TYPE] });
        	
        	
        	sublistItem.addField({
        		id 		: SL_OBJ.SUBLIST.OLDPICKUPDATE.ID,
        		label	: SL_OBJ.SUBLIST.OLDPICKUPDATE.NAME,
        		type	: serverWidget.FieldType[SL_OBJ.SUBLIST.OLDPICKUPDATE.TYPE] });

        	sublistItem.addField({
        		id 		: SL_OBJ.SUBLIST.NEWPICKUPDATE.ID,
        		label	: SL_OBJ.SUBLIST.NEWPICKUPDATE.NAME,
        		type	: serverWidget.FieldType[SL_OBJ.SUBLIST.NEWPICKUPDATE.TYPE] });
        	
        	sublistItem.addField({
        		id 		: SL_OBJ.SUBLIST.OLDDELIVERYDATE.ID,
        		label	: SL_OBJ.SUBLIST.OLDDELIVERYDATE.NAME,
        		type	: serverWidget.FieldType[SL_OBJ.SUBLIST.OLDDELIVERYDATE.TYPE] });
        	
        	sublistItem.addField({
        		id 		: SL_OBJ.SUBLIST.NEWDELIVERYDATE.ID,
        		label	: SL_OBJ.SUBLIST.NEWDELIVERYDATE.NAME,
        		type	: serverWidget.FieldType[SL_OBJ.SUBLIST.NEWDELIVERYDATE.TYPE] });
        	
        	sublistItem.addField({
        		id 		: SL_OBJ.SUBLIST.OLDNOTES.ID,
        		label	: SL_OBJ.SUBLIST.OLDNOTES.NAME,
        		type	: serverWidget.FieldType[SL_OBJ.SUBLIST.OLDNOTES.TYPE] });
        	
        	sublistItem.addField({
        		id 		: SL_OBJ.SUBLIST.NEWNOTES.ID,
        		label	: SL_OBJ.SUBLIST.NEWNOTES.NAME,
        		type	: serverWidget.FieldType[SL_OBJ.SUBLIST.NEWNOTES.TYPE] });
        	
        	sublistItem.addField({
        		id 		: SL_OBJ.SUBLIST.OLDPRIORITY.ID,
        		label	: SL_OBJ.SUBLIST.OLDPRIORITY.NAME,
        		type	: serverWidget.FieldType[SL_OBJ.SUBLIST.OLDPRIORITY.TYPE] });
        	
        	sublistItem.addField({
        		id 		: SL_OBJ.SUBLIST.NEWPRIORITY.ID,
        		label	: SL_OBJ.SUBLIST.NEWPRIORITY.NAME,
        		type	: serverWidget.FieldType[SL_OBJ.SUBLIST.NEWPRIORITY.TYPE] });
        	
        	sublistItem.addField({
        		id 		: SL_OBJ.SUBLIST.OLDDELIVERY.ID,
        		label	: SL_OBJ.SUBLIST.OLDDELIVERY.NAME,
        		type	: serverWidget.FieldType[SL_OBJ.SUBLIST.OLDDELIVERY.TYPE] });
        	
        	sublistItem.addField({
        		id 		: SL_OBJ.SUBLIST.NEWDELIVERY.ID,
        		label	: SL_OBJ.SUBLIST.NEWDELIVERY.NAME,
        		type	: serverWidget.FieldType[SL_OBJ.SUBLIST.NEWDELIVERY.TYPE] });
        	
        	sublistItem.addField({
        		id 		: SL_OBJ.SUBLIST.OLDLOAD.ID,
        		label	: SL_OBJ.SUBLIST.OLDLOAD.NAME,
        		type	: serverWidget.FieldType[SL_OBJ.SUBLIST.OLDLOAD.TYPE] });
        	
        	sublistItem.addField({
        		id 		: SL_OBJ.SUBLIST.NEWLOAD.ID,
        		label	: SL_OBJ.SUBLIST.NEWLOAD.NAME,
        		type	: serverWidget.FieldType[SL_OBJ.SUBLIST.NEWLOAD.TYPE] });
        	
/*        	sublistItem.addField({
        		id 		: SL_OBJ.SUBLIST.CONFIRMATIONNO.ID,
        		label	: SL_OBJ.SUBLIST.CONFIRMATIONNO.NAME,
        		type	: serverWidget.FieldType[SL_OBJ.SUBLIST.CONFIRMATIONNO.TYPE] });*/
        	
        	// =============== Populate Item Sublist Fields ============= //
        	
        	if (isEmpty(objParams.action)){
        	log.debug ('objParams.action', 'Action is Empty');
        	var ssCarrierTransaction = search.load({
        		id: objParams.carrierlist }); }
        	
        	if (objParams.action == 'submit'){
            	log.debug ('objParams.action', 'Submit');
         		if (!isEmpty (objParams.carrier)) {
         		var carrierFilter = search.createFilter({
         		    name: objParams.fields.CARRIER.ID,
         		    operator: search.Operator.ANYOF,
         		    values: objParams.carrier.split('')
         		}); }
         		
         		if (!isEmpty (objParams.status)) {
         		var statusFilter = search.createFilter({
         		    name: objParams.fields.DELIVERY.ID,
         		    operator: search.Operator.ANYOF,
         		    values: objParams.status.split('')
         		}); }
         		
         		if (!isEmpty (objParams.transtatus)) {
         			var objStatus = objParams.transtatus.split('');
         			log.debug ('objStatus Length', objStatus.length);
         			for (var i=0; i < objStatus.length; i++){
         		if (objParams.statusref.hasOwnProperty(objStatus[i]));
         			var strStatus = objParams.statusref[objStatus[i]];
         			log.debug ('strStatus', strStatus);
             		transtatusFilter = search.createFilter({
             		    name: objParams.fields.STATUS.REF,
             		    operator: search.Operator.ANYOF,
             		    values: strStatus}) }
         		}
         		
         		if (!isEmpty (objParams.fromlocation)) {
             		var fromLocationFilter = search.createFilter({
             		    name: objParams.fields.FROMLOCATION.ID,
             		    operator: search.Operator.ANYOF,
             		    values: objParams.fromlocation.split('')
             		}); }
         		
         		if (!isEmpty (objParams.tolocation)) {
             		var toLocationFilter = search.createFilter({
             		    name: objParams.fields.TOLOCATION.ID,
             		    operator: search.Operator.ANYOF,
             		    values: objParams.tolocation.split('')
             	}); }
         		
         		if (!isEmpty (objParams.docid)) {
             		var docFilter = search.createFilter({
             		    name: objParams.fields.NUMBER.ID,
             		    operator: search.Operator.HASKEYWORDS,
             		    values: objParams.docid
             	}); }
         		
         		if (!isEmpty (objParams.docid)) {
             		var docFilter = search.createFilter({
             		    name: objParams.fields.NUMBER.ID,
             		    operator: search.Operator.HASKEYWORDS,
             		    values: objParams.docid
             	}); }
         		
         		if (objParams.printed == 'T') {
             		var printedFilter = search.createFilter({
             		    name: objParams.fields.PRINTED.ID,
             		    operator: search.Operator.IS,
             		    values: objParams.printed
             	}); }
         		
         		if (objParams.sent == 'T') {
             		var sentFilter = search.createFilter({
             		    name: objParams.fields.SENT.ID,
             		    operator: search.Operator.IS,
             		    values: objParams.sent
            	}); }
         		
         		if (!isEmpty (objParams.dateTo) && !isEmpty (objParams.dateFrom)) {
         			if (objParams.dateFrom < objParams.dateTo){
             		var dateFilter = search.createFilter({
             		    name: objParams.fields.TRANDATE.ID,
             		    operator: search.Operator.WITHIN,
             		    values: [objParams.dateFrom, objParams.dateTo] }); 
             		log.debug ('Date Filter', dateFilter)
             		} }
         		
         		
            	var ssCarrierTransaction = search.load({
            		id: objParams.carrierlist }); 
            	
            	if (!isEmpty (carrierFilter)){ ssCarrierTransaction.filters.push(carrierFilter); }
            	if (!isEmpty (statusFilter)){ ssCarrierTransaction.filters.push(statusFilter); }
            	if (!isEmpty (transtatusFilter)){ ssCarrierTransaction.filters.push(transtatusFilter)}; 
            	if (!isEmpty (toLocationFilter)){ ssCarrierTransaction.filters.push(toLocationFilter)};
            	if (!isEmpty (fromLocationFilter)){ ssCarrierTransaction.filters.push(fromLocationFilter)};
            	if (!isEmpty (docFilter)){ ssCarrierTransaction.filters.push(docFilter)};
            	if (!isEmpty (printedFilter)){ ssCarrierTransaction.filters.push(printedFilter)};
            	if (!isEmpty (sentFilter)){ ssCarrierTransaction.filters.push(sentFilter)};
            	if (!isEmpty (dateFilter)){ ssCarrierTransaction.filters.push(dateFilter)};
        	}
        	
        	if (objParams.action == 'bulkprint') {
            	log.debug ('objParams.action', 'Bulk Printing');
    			var intItemCount = context.request.getLineCount({group: SL_OBJ.SUBLIST.ID});
    			log.debug (LOG_NAME, 'intItemCount: ' + intItemCount);
        		var contents = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n";
                contents += "<pdfset>";
                var fileObj;
                var isBulkPrint = false;
    	    	for (var i=0; i < intItemCount; i++) {
    	 	    	var blMarkBuilt = context.request.getSublistValue({
    	 	    		group	: SL_OBJ.SUBLIST.ID,
    				    name	: SL_OBJ.SUBLIST.CHECK.ID,
    				    line	: i
    				});
    	        	
    	        if (blMarkBuilt == 'T'){
    	        	isBulkPrint = true;
    	        	var intId = context.request.getSublistValue({
    		    		group	: SL_OBJ.SUBLIST.ID,
    				    name	: SL_OBJ.SUBLIST.TO.ID,
    				    line	: i
    			    });
    	        	
    	        	var docNumber = context.request.getSublistValue({
    		    		group	: SL_OBJ.SUBLIST.ID,
    				    name	: SL_OBJ.SUBLIST.HIDDENDOC.ID,
    				    line	: i
    			    });
    	        	
    	        	var updateTransferOrder = record.submitFields({
    	        		type: record.Type.TRANSFER_ORDER,
    	        	    id: parseInt(intId),
    	        	    values: {'custbody_cwgp_pickingticketprinted' : true}
    	        	});
    	        	
    	            var transactionFile = render.pickingTicket({
    	            	entityId: parseInt(intId),
    	            	printMode: render.PrintMode.PDF,
    	            });
    	            
    	            transactionFile.folder = __CONFIG.PDF_DIRECTORY;
    	            transactionFile.name = docNumber + '.pdf';
    	            var pdfId = transactionFile.save();
    	            
    		    	fileObj = file.load({
                        id: parseInt(pdfId)
                      });
                     
    		    	var fileUrl = fileObj.url;
    		    	fileObj.isOnline = true;
                  	var fileId = fileObj.save();
                	
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
    	    	
    	    	var ssCarrierTransaction = search.load({
            		id: objParams.carrierlist });
                
        	}
        	
        	
        	if (objParams.action == 'bulkemail') {
        		log.debug ('objParams.action', 'Bulk Email');
				var arrTransferOrderId = [];
    			var intItemCount = context.request.getLineCount({group: SL_OBJ.SUBLIST.ID});
    			for (var i=0; i < intItemCount; i++) {
    	 	    	var blMarkBuilt = context.request.getSublistValue({
    	 	    		group	: SL_OBJ.SUBLIST.ID,
    				    name	: SL_OBJ.SUBLIST.CHECK.ID,
    				    line	: i
    				});
    	        	
    	        if (blMarkBuilt == 'T'){
    	        	isBulkPrint = true;
    	        	var intId = context.request.getSublistValue({
    		    		group	: SL_OBJ.SUBLIST.ID,
    				    name	: SL_OBJ.SUBLIST.TO.ID,
    				    line	: i
    			    });
    	        	
    	        	var docNumber = context.request.getSublistValue({
    		    		group	: SL_OBJ.SUBLIST.ID,
    				    name	: SL_OBJ.SUBLIST.HIDDENDOC.ID,
    				    line	: i
    			    });
    	        	
    	        	var updateTransferOrder = record.submitFields({
    	        		type: record.Type.TRANSFER_ORDER,
    	        	    id: parseInt(intId),
    	        	    values: {'custbody_cwgp_pickingticketsent' : true}
    	        	});
    	        	
    	        	arrTransferOrderId.push(intId);
    	        }
    			}
    			
    			log.debug ('Array of TO ID for Send E-mail', arrTransferOrderId);
				
    			var sendEmail = file.create({
					name : 'sendemail.txt',
					fileType : file.Type.PLAINTEXT,
					contents : JSON.stringify(arrTransferOrderId),
					description : 'Transfer Order ID',
					folder : __CONFIG.PDF_DIRECTORY
				});

				var sendEmailFileId = sendEmail.save();
				
				var toSendEmail = task.create({
					taskType : task.TaskType.MAP_REDUCE,
					scriptId : __CONFIG.SENDEMAIL.SCRIPTID,
					deploymentId : __CONFIG.SENDEMAIL.DEPID,
					params : {
						'custscript_cwgp_fileid' : sendEmailFileId
					}
				});

				var toSendEmailId = toSendEmail.submit();
				log.debug('mrTaskId', toSendEmailId);
				
                var taskStatus = task.checkStatus(toSendEmailId);
                log.debug ('Map Reduce Status', taskStatus);
            	
                redirect.toSuitelet({
                	scriptId: __CONFIG.STATUS.SCRIPTID,
                    deploymentId: __CONFIG.STATUS.DEPID,
                    parameters: {
                   	   'custscript_cwgp_mapreducestatus': toSendEmailId
                   	}
                });
				
    	    	var ssCarrierTransaction = search.load({
            		id: objParams.carrierlist });
        		
        	}
        	
        	ssCarrierTransaction.run().each(function (results){
                var intId = results.getValue({name: objParams.fields.ID.ID,
                	summary: objParams.fields.ID.SUMMARY});
                var strDoc = results.getValue({name: objParams.fields.DOCNUMBER.ID,
                	summary: objParams.fields.DOCNUMBER.SUMMARY});
                var dtDate = results.getValue({name: objParams.fields.TRANDATE.ID,
                	summary: objParams.fields.TRANDATE.SUMMARY});
                var strStatus = results.getText({name: objParams.fields.STATUS.ID,
                	summary: objParams.fields.STATUS.SUMMARY});
                var strCarrier = results.getText({name: objParams.fields.CARRIER.ID,
                	summary: objParams.fields.CARRIER.SUMMARY});
                var strOldDelivery = results.getValue(results.columns[objParams.fields.OLDDELIVERY.NUMBER]);
                var strNewDelivery = results.getValue(results.columns[objParams.fields.NEWDELIVERY.NUMBER]);
                var strOldPickup = results.getValue(results.columns[objParams.fields.OLDPICKUP.NUMBER]);
                var strNewPickup = results.getValue(results.columns[objParams.fields.NEWPICKUP.NUMBER]);
                var strOldNotes = results.getValue(results.columns[objParams.fields.OLDNOTES.NUMBER]);
                var strNewNotes = results.getValue(results.columns[objParams.fields.NEWNOTES.NUMBER]);
                var strOldPriority = results.getValue(results.columns[objParams.fields.OLDPRIORITY.NUMBER]);
                var strNewPriority = results.getValue(results.columns[objParams.fields.NEWPRIORITY.NUMBER]);
                var strOldStatus = results.getValue(results.columns[objParams.fields.OLDSTATUS.NUMBER]);
                var strNewStatus = results.getValue(results.columns[objParams.fields.NEWSTATUS.NUMBER]);
                var strOldLoad = results.getValue(results.columns[objParams.fields.OLDLOAD.NUMBER]);
                var strNewLoad = results.getValue(results.columns[objParams.fields.NEWLOAD.NUMBER]);
                var strConfirmation = results.getValue({name: objParams.fields.CONFIRMATION.ID,
                	summary: objParams.fields.CARRIER.SUMMARY});
               
                sublistItem.setSublistValue({
                    id           : SL_OBJ.SUBLIST.TO.ID,
                    line		 : ctr,
                    value		 : intId });
                
                var strLink = '<a href = https://5377558-sb1.app.netsuite.com/app/accounting/transactions/trnfrord.nl?id=' +intId+' target="_blank">'+strDoc+'</a>'
                
                sublistItem.setSublistValue({
                    id           : SL_OBJ.SUBLIST.CHECK.ID,
                    line		 : ctr,
                    value		 : 'F' }); 
                
                if (!isEmpty(strDoc)){
                sublistItem.setSublistValue({
                    id           : SL_OBJ.SUBLIST.DOCNUMBER.ID,
                    line		 : ctr,
                    value		 : strLink }); }
                
                if (!isEmpty(strDoc)){
                    sublistItem.setSublistValue({
                        id           : SL_OBJ.SUBLIST.HIDDENDOC.ID,
                        line		 : ctr,
                        value		 : strDoc }); }
                
                if (!isEmpty(dtDate)){
                sublistItem.setSublistValue({
                    id           : SL_OBJ.SUBLIST.DATE.ID,
                    line		 : ctr,
                    value		 : dtDate }); }
                
                if (!isEmpty(strStatus)){
                sublistItem.setSublistValue({
                    id           : SL_OBJ.SUBLIST.STATUS.ID,
                    line		 : ctr,
                    value		 : strStatus }); }
                
                if (!isEmpty(strCarrier)){
                sublistItem.setSublistValue({
                    id           : SL_OBJ.SUBLIST.CARRIER.ID,
                    line		 : ctr,
                    value		 : strCarrier }); }
                
                if (!isEmpty(strOldDelivery)){
                sublistItem.setSublistValue({
                    id           : SL_OBJ.SUBLIST.OLDDELIVERYDATE.ID,
                    line		 : ctr,
                    value		 : strOldDelivery }); }
                
                if (!isEmpty(strNewDelivery)){
                sublistItem.setSublistValue({
                     id          : SL_OBJ.SUBLIST.NEWDELIVERYDATE.ID,
                     line		 : ctr,
                     value		 : strNewDelivery }); }
                
                if (!isEmpty(strOldPickup)){
                sublistItem.setSublistValue({
                     id          : SL_OBJ.SUBLIST.OLDPICKUPDATE.ID,
                     line		 : ctr,
                     value		 : strOldPickup }); }
                
                if (!isEmpty(strNewPickup)){
                    sublistItem.setSublistValue({
                      id         : SL_OBJ.SUBLIST.NEWPICKUPDATE.ID,
                      line		 : ctr,
                      value		 : strNewPickup }); }
                
                if (!isEmpty(strOldNotes)){
                    sublistItem.setSublistValue({
                      id         : SL_OBJ.SUBLIST.OLDNOTES.ID,
                      line		 : ctr,
                      value		 : strOldNotes }); }
                
                if (!isEmpty(strNewNotes)){
                    sublistItem.setSublistValue({
                      id         : SL_OBJ.SUBLIST.OLDNOTES.ID,
                      line		 : ctr,
                      value		 : strNewNotes }); }
               
                if (!isEmpty(strOldPriority)){
                    sublistItem.setSublistValue({
                      id         : SL_OBJ.SUBLIST.OLDPRIORITY.ID,
                      line		 : ctr,
                      value		 : strOldPriority }); }
                
                if (!isEmpty(strNewPriority)){
                    sublistItem.setSublistValue({
                      id         : SL_OBJ.SUBLIST.NEWPRIORITY.ID,
                      line		 : ctr,
                      value		 : strNewPriority }); }
                
                if (!isEmpty(strOldStatus)){
                    sublistItem.setSublistValue({
                      id         : SL_OBJ.SUBLIST.OLDDELIVERY.ID,
                      line		 : ctr,
                      value		 : strOldStatus }); }
                
                if (!isEmpty(strNewStatus)){
                    sublistItem.setSublistValue({
                      id         : SL_OBJ.SUBLIST.NEWDELIVERY.ID,
                      line		 : ctr,
                      value		 : strNewStatus }); }
                
                if (!isEmpty(strOldLoad)){
                    sublistItem.setSublistValue({
                      id         : SL_OBJ.SUBLIST.OLDLOAD.ID,
                      line		 : ctr,
                      value		 : strOldLoad }); }
                
                if (!isEmpty(strNewLoad)){
                    sublistItem.setSublistValue({
                      id         : SL_OBJ.SUBLIST.NEWLOAD.ID,
                      line		 : ctr,
                      value		 : strNewLoad }); }
                
                if (!isEmpty(strConfirmation)){
                    sublistItem.setSublistValue({
                      id         : SL_OBJ.SUBLIST.CONFIRMATIONNO.ID,
                      line		 : ctr,
                      value		 : strConfirmation }); }
                
                
                ctr++;
                
                return true;
        	
        	});
            
        } catch (e) {
    		
    		log.debug('Error: ', e);
            log.error(LOG_NAME, 
                JSON.stringify({
                    "Error Code"    : e.code,
                    "Error Message" : e.message
                })
            );
            injectErrorPage(e, context);
        }
        
        context.response.writePage(objForm);
    }

    return {
        onRequest: onRequest
    };
    
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

			var objHtmlFileIds = runtime.getCurrentScript().getParameter({name: __CONFIG.PARAMETERS.HTML_ID});
			log.debug ('objHtmlFileIds', objHtmlFileIds);
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
