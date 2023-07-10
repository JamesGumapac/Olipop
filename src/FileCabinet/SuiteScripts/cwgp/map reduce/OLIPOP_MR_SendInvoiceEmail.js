/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

/**
 * Author: Erick Dela Rosa
 * Reference: OPOP_0028
 * Date: 24 Jan 2023
 * 
 *  Date Modified       Modified By                 Notes
 *  24 Jan 2023         Erick Dela Rosa             Initial Development
 * 
 * 
 */
define(['N/query', 'N/runtime', 'N/file', 'N/record', 'N/email', 'N/search', 'N/ui/serverWidget', 'N/format','N/render'],

function(query, runtime, file, record, email, search, widget,format,render) {
	
	//var intTargetHour = 13;
	var intTargetHour = 5;
	var intTargetMinute = 0;
	var intTargetSecond = 0;
	var EMAIL_PARAMETERS = {
		AUTHOR: 433710 //CW Global Partners - 433710, Olipop AR - 1225141
	};
	
	var stSentDateCustomFieldID = 'custbody_cwgp_invoicesentdate';
	
	var intInvoiceSearchID = 2351;//SB - 2351, Production - 2384
	var intCustomerContactEmailSearchID = 2350;//SB - 2350, Production - 2383
   
    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData() {
		
		var objInvoiceData = getInvoiceData();
		var arrInvoiceData = [];
		if (objInvoiceData.invoiceData.length > 0) arrInvoiceData = addCustomerContactEmails(objInvoiceData);
		
		return arrInvoiceData;
    }//getInputData end
	
	function getInvoiceData() {
		var stFunctionName = 'getInvoiceData';
		log.debug(stFunctionName,'START');
		
		var objMainlineFilter = search.createFilter({
			name: 'mainline',
			operator: search.Operator.IS,
			values: ['T']
		});
		var objDateCreatedFilter = search.createFilter({
			name: 'datecreated',
			operator: search.Operator.ONORAFTER,
			//values: ['startoflastmonth'] //for testing
			//values: ['startoflastfiscalquarter'] //for testing
			values: ['yesterday'] //actual value
		});
		var objSentDateFilter = search.createFilter({
			name: stSentDateCustomFieldID,
			operator: search.Operator.ISEMPTY
		});
		var arrFilters = [objMainlineFilter,objDateCreatedFilter,objSentDateFilter];
		//var arrFilters = [objMainlineFilter,objDateCreatedFilter];
		//temporary filter for testing
		var objCustomerParentFilter = search.createFilter({
			name: 'formulatext',
			operator: search.Operator.IS,
			formula: '{customermain.parent}',
			values: ['10001 UNFI']
		});
		//arrFilters.push(objCustomerParentFilter);
		
		var objDateCreatedColumn = search.createColumn('datecreated');
		var objCustomerParentColumn = search.createColumn({
			name: 'parent',
			join: 'customerMain'
		});
		var objDocumentNumberColumn = search.createColumn('tranid');
		var objCustomerInternalIDColumn = search.createColumn({
			name: 'internalid',
			join: 'customerMain'
		});
		var objCustomerCompanyNameColumn = search.createColumn({
			name: 'companyname',
			join: 'customerMain'
		});
		var objPONumberColumn = search.createColumn('otherrefnum');
		var arrColumns = [objDateCreatedColumn,objCustomerParentColumn,objDocumentNumberColumn,objCustomerInternalIDColumn,objCustomerCompanyNameColumn,objPONumberColumn];
		
		/*var objInvoiceSearch = search.create({
			//type: search.Type.TRANSACTION,
			type: search.Type.INVOICE,
			filters: arrFilters,
			columns: arrColumns
		});*/
		var objInvoiceSearch = search.load(intInvoiceSearchID);
		
		var arrInvoiceData = [];
		var arrCustomerIDs = [];
		var dtTargetDate = new Date();
		dtTargetDate.setDate(dtTargetDate.getDate() - 1);
		dtTargetDate.setHours(intTargetHour);
		dtTargetDate.setMinutes(intTargetMinute);
		dtTargetDate.setSeconds(intTargetSecond);
		
		var objPagedData = objInvoiceSearch.runPaged();
		objPagedData.pageRanges.forEach(function(pageRange){
			var objPage = objPagedData.fetch({index: pageRange.index});
			objPage.data.forEach(function(result){
				
				var stDateCreated = result.getValue(objDateCreatedColumn);
				var intCustomerParentID = result.getValue(objCustomerParentColumn);
				var intCustomerInternalID = result.getValue(objCustomerInternalIDColumn);
				//log.debug('stDateCreated',stDateCreated);
				var dtDateCreated = new Date(stDateCreated);
				//if (dtDateCreated >= dtTargetDate) {
				//if (dtDateCreated <= dtTargetDate) { //if statement for testing purposes
					var objRawResult = {};
					objRawResult.customerParentID = intCustomerParentID;
					objRawResult.invoiceResult = result;
					arrInvoiceData.push(objRawResult);
					if (arrCustomerIDs.indexOf(intCustomerParentID) == -1) arrCustomerIDs.push(intCustomerParentID);
					if (arrCustomerIDs.indexOf(intCustomerInternalID) == -1) arrCustomerIDs.push(intCustomerInternalID);
				//}
				
			});//objPage.data.forEach(function(result) end
		});//objPagedData.pageRanges.forEach(function(pageRange) end
		
		var objInvoiceData = {};
		objInvoiceData.invoiceData = arrInvoiceData;
		objInvoiceData.customerIDs = arrCustomerIDs;
		
		log.debug('Raw Invoice Data',arrInvoiceData);
		log.debug('Raw Invoice Data count',arrInvoiceData.length);
		log.debug('Customer IDs',arrCustomerIDs);
		log.debug('Customer ID count',arrCustomerIDs.length);
		
		log.debug(stFunctionName,'END');
		
		return objInvoiceData;
	}//getInvoiceData end
	
	function addCustomerContactEmails(objInvoiceData) {
		var stFunctionName = 'addCustomerContactEmails';
		log.debug(stFunctionName,'START');
		
		var objInternalIDFilter = search.createFilter({
			name: 'internalid',
			operator: search.Operator.ANYOF,
			values: objInvoiceData.customerIDs
		});
		var objCustomerContactEmailFilter = search.createFilter({
			name: 'custrecord_dl_recipient_email',
			join: 'CUSTRECORD_3805_DUNNING_RECIPIENT_CUST',
			operator: search.Operator.ISNOTEMPTY
		});
		var arrFilters = [objInternalIDFilter,objCustomerContactEmailFilter];
		
		var objParentColumn = search.createColumn('parent');
		var objParentCompanyNameColumn = search.createColumn({
			name: 'companyname',
			join: 'topLevelParent'
		});
		var objCustomerContactEmailColumn = search.createColumn({
			name: 'custrecord_dl_recipient_email',
			join: 'CUSTRECORD_3805_DUNNING_RECIPIENT_CUST'
		});
		var objCompanyNameColumn = search.createColumn('companyname');
		var arrColumns = [objParentColumn,objParentCompanyNameColumn,objCustomerContactEmailColumn,objCompanyNameColumn];
		
		/*var objCustomerSearch = search.create({
			type: search.Type.CUSTOMER,
			filters: arrFilters,
			columns: arrColumns
		});*/
		var objCustomerSearch = search.load(intCustomerContactEmailSearchID);
		
		var arrCustomerContactEmails = [];
		var objCustomerContactEmails = {};
		
		var objPagedData = objCustomerSearch.runPaged();
		objPagedData.pageRanges.forEach(function(pageRange){
			var objPage = objPagedData.fetch({index: pageRange.index});
			objPage.data.forEach(function(result){
				
				//var intCustomerID = result.id;
				var intParentID = result.getValue(objParentColumn);
				var stParentCompanyName = result.getValue(objParentCompanyNameColumn);
				var stCustomerContactEmail = result.getValue(objCustomerContactEmailColumn);
				var stCompanyName = result.getValue(objCompanyNameColumn);
				
				var intCustomerContactEmailIndex = -1;
				arrCustomerContactEmails.forEach(function(contactemail,index){
					if (contactemail.parentID == intParentID) intCustomerContactEmailIndex = index;
				});
				
				if (intCustomerContactEmailIndex == -1) {
					objCustomerContactEmails = {};
					objCustomerContactEmails.parentID = intParentID;
					objCustomerContactEmails.parentCompanyName = stParentCompanyName;
					objCustomerContactEmails.companyName = stCompanyName;
					objCustomerContactEmails.contactEmails = [];
					objCustomerContactEmails.contactEmails.push(stCustomerContactEmail);
					arrCustomerContactEmails.push(objCustomerContactEmails);
				} else {
					if (arrCustomerContactEmails[intCustomerContactEmailIndex].contactEmails.indexOf(stCustomerContactEmail) == -1) arrCustomerContactEmails[intCustomerContactEmailIndex].contactEmails.push(stCustomerContactEmail);
				}
				
			});//objPage.data.forEach(function(result) end
		});//objPagedData.pageRanges.forEach(function(pageRange) end
		
		log.debug('Customer Contact Email count',arrCustomerContactEmails.length);
		log.debug('Customer Contact Emails',arrCustomerContactEmails);
		
		var arrRawInvoiceData = objInvoiceData.invoiceData;
		var arrInvoiceData = [];
		var objInvoiceWithContactEmail = {};
		arrRawInvoiceData.forEach(function(rawresult){
			var intCustomerParentID = rawresult.customerParentID;
			objInvoiceWithContactEmail = {};
			objInvoiceWithContactEmail = JSON.parse(JSON.stringify(rawresult.invoiceResult));
			objInvoiceWithContactEmail.contactEmails = [];
			arrCustomerContactEmails.forEach(function(contactemail){
				if (contactemail.parentID == intCustomerParentID) {
					objInvoiceWithContactEmail.parentCompanyName = contactemail.parentCompanyName;
					objInvoiceWithContactEmail.contactEmails = contactemail.contactEmails;
				}
			});
			if (objInvoiceWithContactEmail.parentCompanyName) arrInvoiceData.push(objInvoiceWithContactEmail);
		});

		log.debug('Invoice Data with Contact Emails',arrInvoiceData);
		log.debug('Invoice Data with Contact Emails count',arrInvoiceData.length);
		
		log.debug(stFunctionName,'END');
		
		return arrInvoiceData;
	}//addCustomerContactEmails end
	
    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
		var objSearchResult = JSON.parse(context.value);
		//log.debug('objSearchResult',JSON.stringify(objSearchResult));
		
		var intCustomerParentID = objSearchResult.values['customerMain.parent'][0].value;
		var objSearchResultValues = objSearchResult.values;
		objSearchResultValues.id = objSearchResult.id;
		objSearchResultValues.parentCompanyName = objSearchResult.parentCompanyName;
		objSearchResultValues.contactEmails = objSearchResult.contactEmails;
		
		context.write({
			key: intCustomerParentID,
			value: objSearchResultValues
		});
    }//map end
	
    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {
		
		var intCustomerParentID = context.key;
		var arrSearchValues = context.values;
		log.debug('arrSearchValues',arrSearchValues);
		//var stCustomerParent = JSON.parse(arrSearchValues[0])['customer.parent'][0].text;
		var stCustomerParent = JSON.parse(arrSearchValues[0]).parentCompanyName;
		var arrCustomerContactEmails = JSON.parse(arrSearchValues[0]).contactEmails;
		
		var objRecipients = getRecipients(arrCustomerContactEmails);
		
		var dtToday = new Date();
		var stToday = format.format({
			type: format.Type.DATE,
			value: dtToday
		});
		var stSubject = stToday + ' Olipop Invoices for ' + stCustomerParent;
		
		var stMessage = '<p>Hello,</p>';
		stMessage += '<br/>';
		stMessage += '<p>Attached please find the latest Olipop invoice(s) for ' + stCustomerParent + '</p>';
		stMessage += '<ul>';
		
		var arrAttachments = [];
		arrSearchValues.forEach(function(searchvalue){
			var objSearchValue = JSON.parse(searchvalue);
			stMessage += '<li>';
			stMessage += objSearchValue.tranid + '&nbsp;&nbsp;&nbsp;&nbsp;';
			stMessage += objSearchValue['customerMain.companyname'] + '&nbsp;&nbsp;&nbsp;&nbsp;';
			stMessage += 'PO#' + objSearchValue.otherrefnum;
			stMessage += '</li>';
			try {
				var objInvoicePDFFile = render.transaction({
					entityId: parseInt(objSearchValue.id),
					printMode: render.PrintMode.PDF
				});
				arrAttachments.push(objInvoicePDFFile);
			} catch (e) {
				log.debug('invoice pdf render error',e);
			}
		});
		
		stMessage += '</ul>';
		stMessage += '<br/>';
		stMessage += '<p>Please let us know if you have any questions.</p>';
		stMessage += '<br/>';
		stMessage += '<p>As always, thank you for your business!</p>';
		//temporary added to message
		/*stMessage += '<br/>';
		stMessage += '<p>recipients:' + arrCustomerContactEmails.toString() + '</p>';*/
		log.debug('stMessage',stMessage);
		
		var objEmailSendParameters = {};
		objEmailSendParameters.author = EMAIL_PARAMETERS.AUTHOR;
		//objEmailSendParameters.recipients = arrCustomerContactEmails;
		//objEmailSendParameters.recipients = EMAIL_PARAMETERS.AUTHOR;
		objEmailSendParameters.subject = stSubject;
		objEmailSendParameters.body = stMessage;
		if (arrAttachments.length > 0) objEmailSendParameters.attachments = arrAttachments;
		
		try {
			if (arrCustomerContactEmails.length <= 10) {
				objEmailSendParameters.recipients = objRecipients.customerRecipients;
				if (objRecipients.olipopRecipients) objEmailSendParameters.cc = objRecipients.olipopRecipients;
				email.send(objEmailSendParameters);
			} else {
				objRecipients.customerRecipients.forEach(function(emailgroup){
					objEmailSendParameters.recipients = emailgroup;
					//temporary added to message
					/*var stTempMessage = stMessage;
					stTempMessage += '<br/>';
					stTempMessage += '<p>recipients:' + emailgroup.toString() + '</p>';
					objEmailSendParameters.body = stTempMessage;*/
					//temporary
					email.send(objEmailSendParameters);
				});
				objRecipients.olipopRecipients.forEach(function(emailgroup){
					objEmailSendParameters.recipients = emailgroup;
					//temporary added to message
					/*var stTempMessage = stMessage;
					stTempMessage += '<br/>';
					stTempMessage += '<p>recipients:' + emailgroup.toString() + '</p>';
					objEmailSendParameters.body = stTempMessage;*/
					//temporary
					email.send(objEmailSendParameters);
				});
			}
			
			var objValueParams = {};
			objValueParams[stSentDateCustomFieldID] = stToday;
			
			arrSearchValues.forEach(function(searchvalue){
				var objSearchValue = JSON.parse(searchvalue);
				var intInvoiceID = objSearchValue.id;
				record.submitFields({
					type: record.Type.INVOICE,
					id: intInvoiceID,
					values: objValueParams
				});
			});
		} catch (e) {
			log.debug('email parameters',objEmailSendParameters);
			log.debug('email sending error',e);
		}
		
		context.write({
			key: intCustomerParentID,
			value: arrSearchValues
		});
    }//reduce end
	
	function getRecipients(arrCustomerContactEmails){
		var stFunctionName = 'getRecipients';
		log.debug(stFunctionName,'START');
		
		log.debug('contact email count',arrCustomerContactEmails.length);
		log.debug('contact emails',arrCustomerContactEmails);
		
		var arrOlipopRecipients = [];
		var arrOlipopGroup = [];
		var intOlipopGroupCount = 0;
		var arrCustomerRecipients = [];
		var arrCustomerGroup = [];
		var intCustomerGroupCount = 0;
		
		if (arrCustomerContactEmails.length <= 10) {
			arrCustomerContactEmails.forEach(function(email){
				if (email.indexOf('drinkolipop.com') > -1) arrOlipopRecipients.push(email);
				else arrCustomerRecipients.push(email);
			});
		} else {
			arrCustomerContactEmails.forEach(function(email){
				if (email.indexOf('drinkolipop.com') > -1) {		
					if (!arrOlipopRecipients[intOlipopGroupCount]) {
						arrOlipopGroup.push(email);
						arrOlipopRecipients.push(arrOlipopGroup);
					} else {
						arrOlipopRecipients[intOlipopGroupCount].push(email);
					}
					if (arrOlipopGroup.length == 10) {
						arrOlipopGroup = [];
						intOlipopGroupCount++;
					}
				}
				else {
					if (!arrCustomerRecipients[intCustomerGroupCount]) {
						arrCustomerGroup.push(email);
						arrCustomerRecipients.push(arrCustomerGroup);
					} else {
						arrCustomerRecipients[intCustomerGroupCount].push(email);
					}
					if (arrCustomerGroup.length == 10) {
						arrCustomerGroup = [];
						intOlipopGroupCount++;
					}
				}
			});
		}
		
		log.debug('olipop recipients',arrOlipopRecipients);
		log.debug('customer recipients',arrCustomerRecipients);
		
		var objRecipients = {};
		objRecipients.olipopRecipients = arrOlipopRecipients;
		objRecipients.customerRecipients = arrCustomerRecipients;
		
		log.debug(stFunctionName,'END');
		return objRecipients;
	}//getRecipients end

    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {
		
		/*var arrItemReceipt = [];
		summary.mapSummary.keys.iterator().each(function (key){
			arrItemReceipt.push(key);
			return true;
		});

		log.debug('arrItemReceipt count',arrItemReceipt.length);
		log.debug({
			title: 'Item Receipt list',
			details: arrItemReceipt
		});*/
		
		var intInvoiceTotal = 0;
		var arrTotalCustomerParent = [];
		var arrSearchValues = [];
		summary.output.iterator().each(function (key, value){
			arrTotalCustomerParent.push(key);
			arrSearchValues.push(JSON.parse(value));
			intInvoiceTotal += JSON.parse(value).length;
			return true;
		 });

		log.debug('Total invoice processed', intInvoiceTotal);
		log.debug('Customer Parent count', arrTotalCustomerParent.length);
		log.debug('Customer Parent list', arrTotalCustomerParent);
		log.debug('arrSearchValues list', arrSearchValues);
    }//summarize end

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});