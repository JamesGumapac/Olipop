/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

/**
 * Author: Erick Dela Rosa
 * Reference: OPOP_0023
 * Date: 30 Mar 2023
 * 
 *  Date Modified       Modified By                 Notes
 *  30 Mar 2023         Erick Dela Rosa             Initial Development
 * 
 * 
 */
define(['N/log', 'N/runtime', 'N/file', 'N/record', 'N/email', 'N/search', 'N/ui/serverWidget', 'N/format'],

    function(log, runtime, file, record, email, search, widget, format) {
		
		var objEDI997RecordInfo = {
			ID: 'customrecord_cwgp_edi997',
			FIELDS: {
				'3PL': 'custrecord_cwgp_edi997_3pl',
				TRANSACTION: 'custrecord_cwgp_edi997_transaction',
				TYPE: 'custrecord_cwgp_edi997_type'
			}
		};
		
		var objEDI997Type = {
			INBOUND: 1,
			OUTBOUND: 2
		};
		
		var stEDI997ReceivedFieldID = 'custbody_cwgp_edi997received';
		
		var objTransactionTypes = {
			'Sales Order': record.Type.SALES_ORDER,
			'Transfer Order': record.Type.TRANSFER_ORDER,
			'Purchase Order': record.Type.PURCHASE_ORDER
		};
		
		function afterSubmit(scriptContext) {
			var stFunctionName = 'afterSubmit';
			log.debug(stFunctionName + ' START');
			log.debug('scriptContext', JSON.stringify(scriptContext));
			log.debug('scriptContext.type', JSON.stringify(scriptContext.type));
			
			var objNewRec = scriptContext.newRecord;
			var objOldRec = scriptContext.oldRecord;
			var intNewRecId = objNewRec.id;
			var stNewRecType = objNewRec.type;
			
			var arrValidUserEventType = [scriptContext.UserEventType.CREATE];
			//var arrValidUserEventType = [scriptContext.UserEventType.CREATE,scriptContext.UserEventType.EDIT];
			
			var int997Type = objNewRec.getValue(objEDI997RecordInfo.FIELDS.TYPE);
			
			if (arrValidUserEventType.indexOf(scriptContext.type) > -1 && int997Type == objEDI997Type.INBOUND) {
				
				var intTransactionID = objNewRec.getValue(objEDI997RecordInfo.FIELDS.TRANSACTION);
				
				var objTransactionLookup = search.lookupFields({
					type: search.Type.TRANSACTION,
					id: intTransactionID,
					columns: ['type']
				});
				
				var stTransactionType = objTransactionLookup['type'][0].text;
				var stRecordTxType = objTransactionTypes[stTransactionType];
				
				log.debug('[intNewRecId,stTransactionType,intTransactionID]',[intNewRecId,stTransactionType,intTransactionID]);
				
				if (stRecordTxType) {
					var objFieldValues = {};
					objFieldValues[stEDI997ReceivedFieldID] = true;
					
					record.submitFields({
						type: stRecordTxType,
						id: intTransactionID,
						values: objFieldValues
					});
				}
				
			}//end if 
			
			log.debug(stFunctionName + ' END');
		}//afterSubmit end

        return {
            afterSubmit: afterSubmit
        };
    });