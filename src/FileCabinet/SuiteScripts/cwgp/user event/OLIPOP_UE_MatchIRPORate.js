/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

/**
 * Author: Erick Dela Rosa
 * Reference: 
 * Date: 14 Nov 2022
 * 
 *  Date Modified       Modified By                 Notes
 *  14 Nov 2022         Erick Dela Rosa             Initial Development
 * 
 * 
 */
define(['N/log', 'N/runtime', 'N/file', 'N/record', 'N/email', 'N/search', 'N/ui/serverWidget', 'N/format', 'N/render','N/config', 'N/url', 'N/query'],

    function(log, runtime, file, record, email, search, widget, format, render, config, url, query) {
		
		function afterSubmit(scriptContext) {
			var stFunctionName = 'afterSubmit';
			log.debug(stFunctionName, 'START');
			log.debug('scriptContext', JSON.stringify(scriptContext));
			log.debug('scriptContext.type', JSON.stringify(scriptContext.type));
			
			var objNewRec = scriptContext.newRecord;
			var objOldRec = scriptContext.oldRecord;
			var intNewRecId = objNewRec.id;
			var stNewRecType = objNewRec.type;
			
			var arrValidUserEventTypes = [scriptContext.UserEventType.CREATE,scriptContext.UserEventType.EDIT];
			var arrValidRecordTypes = [record.Type.PURCHASE_ORDER,record.Type.ITEM_RECEIPT];
			
			if (arrValidUserEventTypes.indexOf(scriptContext.type) != -1 && arrValidRecordTypes.indexOf(stNewRecType) != -1) {
				
				var intPurchaseOrderId, intItemReceiptId;
				
				if (stNewRecType == record.Type.PURCHASE_ORDER) intPurchaseOrderId = intNewRecId;
				if (stNewRecType == record.Type.ITEM_RECEIPT) {
					intItemReceiptId = intNewRecId;
					intPurchaseOrderId = objNewRec.getValue('createdfrom');
				}
				
				//create PO-Item Receipt search
				var arrPurchaseOrderData = createPurchaseOrderItemReceiptSearch(intPurchaseOrderId);
				
				if (arrPurchaseOrderData.length > 0) {
					
					//create PO-Item Receipt line link
					var objPreviousTransactionLineLinkData = createPreviousTransactionLineLinkData(intPurchaseOrderId);
				
					if (objPreviousTransactionLineLinkData.arrItemReceiptIDs.length > 0) {
						
						//on purchase order update, update all item receipts
						if (stNewRecType == record.Type.PURCHASE_ORDER)	updateAllItemReceipts(objPreviousTransactionLineLinkData,arrPurchaseOrderData);
						
						//on item receipt update, update purchase order and other item receipts
						if (stNewRecType == record.Type.ITEM_RECEIPT) {
							var objPurchaseOrderRecord = record.load({
								type: record.Type.PURCHASE_ORDER,
								id: intPurchaseOrderId,
								isDynamic: true
							});
							var objItemReceiptData = getItemReceiptData(intItemReceiptId);
							var arrUpdatedPurchaseOrderLines = updatePurchaseOrder(objPreviousTransactionLineLinkData,objItemReceiptData,objPurchaseOrderRecord);
							if (arrUpdatedPurchaseOrderLines.length > 0) updateOtherItemReceipts(objPreviousTransactionLineLinkData,arrUpdatedPurchaseOrderLines,intItemReceiptId);
						}
					
					}//if (objPreviousTransactionLineLinkData.arrItemReceiptIDs.length > 0) end
				
				}//if (arrPurchaseOrderData.length > 0) end
				
			}//if (arrValidUserEventTypes.indexOf(scriptContext.type) != -1) end
			
			log.debug(stFunctionName,' END');
		}//afterSubmit end
		
		function createPurchaseOrderItemReceiptSearch(intPurchaseOrderId) {
			var stFunctionName = 'createPurchaseOrderItemReceiptSearch';
			log.debug(stFunctionName,'START');
			
			log.debug('intPurchaseOrderId',intPurchaseOrderId);
			
			var objApplyingTransactionTypeFilter = search.createFilter({
				name: 'type',
				join: 'applyingtransaction',
				operator: search.Operator.ANYOF,
				values: ['ItemRcpt']
			});
			var objAppliedToTransactionTypeFilter = search.createFilter({
				name: 'type',
				join: 'appliedtotransaction',
				operator: search.Operator.NONEOF,
				values: ['PurchCon','BlankOrd']
			});
			var objStatusFilter = search.createFilter({
				name: 'status',
				operator: search.Operator.ANYOF,
				values: ['PurchOrd:E','PurchOrd:F','PurchOrd:D','PurchOrd:B'] //Purchase Order:Pending Billing/Partially Received, Purchase Order:Pending Bill, Purchase Order:Partially Received, Purchase Order:Pending Receipt
			});
			var objQuantityFormulaFilter = search.createFilter({
				name: 'formulanumeric',
				operator: search.Operator.GREATERTHAN,
				formula: '{quantity}-{quantitybilled}',
				values: ['0']
			});
			var objInternalIDFilter = search.createFilter({
				name: 'internalid',
				operator: search.Operator.ANYOF,
				values: [intPurchaseOrderId]
			});
			var arrFilters = [objApplyingTransactionTypeFilter,objAppliedToTransactionTypeFilter,objStatusFilter,objInternalIDFilter,objQuantityFormulaFilter];
			
			var objApplyingTransactionColumn = search.createColumn({
				name: 'applyingtransaction'
			});
			var objRateColumn = search.createColumn({
				name: 'rate'
			});
			var objLineColumn = search.createColumn({
				name: 'line'
			});
			var objUnitColumn = search.createColumn({
				name: 'unit'
			});
			var objItemUnitsTypeColumn = search.createColumn({
				name: 'unitstype',
				join: 'item'
			});
			var arrColumns = [objApplyingTransactionColumn,objRateColumn,objLineColumn,objUnitColumn,objItemUnitsTypeColumn];
			
			var objPurchaseOrderSearch = search.create({
				type: search.Type.PURCHASE_ORDER,
				filters: arrFilters,
				columns: arrColumns
			});
			
			var arrPurchaseOrderData = [];
			var objPurchaseOrderData = {};
			
			objPurchaseOrderSearch.run().each(function(result){
				var intCorrespondingItemReceiptId = result.getValue(objApplyingTransactionColumn);
				var flItemRate = result.getValue(objRateColumn);
				var intLine = result.getValue(objLineColumn);
				var stUnit = result.getValue(objUnitColumn);
				var intUnitsType = result.getValue(objItemUnitsTypeColumn);
				var flActualRate = getActualRate(flItemRate,stUnit,intUnitsType);
				
				objPurchaseOrderData = {};
				objPurchaseOrderData.itemreceiptid = intCorrespondingItemReceiptId;
				objPurchaseOrderData.rate = flActualRate;
				objPurchaseOrderData.line = intLine;
				arrPurchaseOrderData.push(objPurchaseOrderData);
				
				return true;
			});
			
			log.debug('arrPurchaseOrderData',arrPurchaseOrderData);
			
			log.debug(stFunctionName,'END');
			
			return arrPurchaseOrderData;
		}//createPurchaseOrderItemReceiptSearch end
		
		function getActualRate(flItemRate,stUnit,intUnitsType) {
			var stFunctionName = 'getActualRate';
			log.debug(stFunctionName,'START');
			
			var flActualRate = 0;
			
			if (flItemRate) flActualRate = flItemRate;
			
			if (stUnit && intUnitsType) {
				var objUnitsTypeRecord = record.load({
					type: record.Type.UNITS_TYPE,
					id: intUnitsType,
					isDynamic: true
				});
				
				var intBaseUnitLine = objUnitsTypeRecord.findSublistLineWithValue({
					sublistId: 'uom',
					fieldId: 'baseunit',
					value: true
				});
				
				var intUnitLine = objUnitsTypeRecord.findSublistLineWithValue({
					sublistId: 'uom',
					fieldId: 'unitname',
					value: stUnit
				});
				
				if (intBaseUnitLine != intUnitLine) {
					var flUnitConversionRate = objUnitsTypeRecord.getSublistValue({
						sublistId: 'uom',
						fieldId: 'conversionrate',
						line: intUnitLine
					});
					flActualRate = parseFloat(flItemRate) * parseFloat(flUnitConversionRate);
					//flActualRate = flActualRate.toFixed(2);
				}
			}
			
			log.debug(stFunctionName,'END');
			return flActualRate;
		}//getActualRate end
		
		function createPreviousTransactionLineLinkData(intPurchaseOrderId) {
			var stFunctionName = 'createPreviousTransactionLineLinkData';
			log.debug(stFunctionName,'START');
			
			log.debug('intPurchaseOrderId',intPurchaseOrderId);
			
			var objRelatedItemReceiptQuery = "SELECT prevLink.previousdoc, prevLink.previousline, prevLink.nextdoc, prevLink.nextline FROM previoustransactionlinelink prevLink WHERE prevLink.previousdoc = " + intPurchaseOrderId;
			
			var arrItemReceiptItemRateQueryResults = query.runSuiteQL({
				query: objRelatedItemReceiptQuery
			}).asMappedResults();
			
			var arrItemReceiptIDs = [];
			
			arrItemReceiptItemRateQueryResults.forEach(function(result){	
				if (arrItemReceiptIDs.indexOf(result.nextdoc) == -1) arrItemReceiptIDs.push(result.nextdoc);
			});
			
			var objPreviousTransactionLineLinkData = {
				arrItemReceiptIDs: arrItemReceiptIDs,
				arrItemReceiptItemRateQueryResults: arrItemReceiptItemRateQueryResults
			};
			
			log.debug('objPreviousTransactionLineLinkData',JSON.stringify(objPreviousTransactionLineLinkData));
			
			log.debug(stFunctionName,'END');
			
			return objPreviousTransactionLineLinkData;
		}//createPreviousTransactionLineLinkData end
		
		function getItemReceiptData(intItemReceiptId) {
			var stFunctionName = 'getItemReceiptData';
			log.debug(stFunctionName,'START');
			
			var objItemReceiptRecord = record.load({
				type: record.Type.ITEM_RECEIPT,
				id: intItemReceiptId,
				isDynamic: true
			});
			
			var intItemCount = objItemReceiptRecord.getLineCount('item');
			
			var objItemReceiptData = {};
			var arrItemReceiptData = [];
			for (var i = 0; i < intItemCount; i++) {
				var flItemRate = objItemReceiptRecord.getSublistValue({
					sublistId: 'item',
					fieldId: 'rate',
					line: i
				});
				arrItemReceiptData.push(flItemRate);
			}
			
			objItemReceiptData.id = intItemReceiptId;
			objItemReceiptData.itemrates = arrItemReceiptData;
			log.debug('objItemReceiptData',objItemReceiptData);
			
			log.debug(stFunctionName,'END');
			
			return objItemReceiptData;
		}//getItemReceiptData end
		
		function updateAllItemReceipts(objPreviousTransactionLineLinkData,arrPurchaseOrderData) {
			var stFunctionName = 'updateAllItemReceipts';
			log.debug(stFunctionName,'START');
			
			objPreviousTransactionLineLinkData.arrItemReceiptIDs.forEach(function(itemreceiptid){
				
				var objItemReceiptRecord = record.load({
					type: record.Type.ITEM_RECEIPT,
					id: itemreceiptid,
					isDynamic: true
				});
				var blHasChanged = false;
				objPreviousTransactionLineLinkData.arrItemReceiptItemRateQueryResults.forEach(function(itemreceiptdata,index){
					if (itemreceiptid == itemreceiptdata.nextdoc) {
						var intItemReceiptLine = itemreceiptdata.nextline - 1;
						log.debug('intItemReceiptLine',intItemReceiptLine);
						var flItemReceiptLineRate = objItemReceiptRecord.getSublistValue({
							sublistId: 'item',
							fieldId: 'rate',
							line: intItemReceiptLine
						});
						var flPurchaseOrderLineRate;
						arrPurchaseOrderData.forEach(function(purchaseorderdata,index){
							if (purchaseorderdata.itemreceiptid == itemreceiptid && purchaseorderdata.line == itemreceiptdata.previousline) flPurchaseOrderLineRate = purchaseorderdata.rate;
						});
						log.debug('line',itemreceiptdata.nextline);
						log.debug('flPurchaseOrderLineRate',flPurchaseOrderLineRate);
						log.debug('flItemReceiptLineRate',flItemReceiptLineRate);
						if (flPurchaseOrderLineRate != flItemReceiptLineRate) {
							objItemReceiptRecord.selectLine({
								sublistId: 'item',
								line: intItemReceiptLine
							});
							objItemReceiptRecord.setCurrentSublistValue({
								sublistId: 'item',
								fieldId: 'rate',
								value: flPurchaseOrderLineRate
							});
							objItemReceiptRecord.commitLine({
								sublistId: 'item'
							});
							blHasChanged = true;
						}//if (flPurchaseOrderLineRate != flItemReceiptLineRate) end
					}//if (itemreceiptid == itemreceiptdata.nextdoc) end
					
				});//objPreviousTransactionLineLinkData.arrItemReceiptItemRateQueryResults.forEach(function(itemreceiptdata,index) end
				
				if (blHasChanged) {
					log.debug('blHasChanged',blHasChanged);
					var intItemReceiptId = objItemReceiptRecord.save();
				}
					
				
			});//objPreviousTransactionLineLinkData.arrItemReceiptIDs.forEach(function(itemreceiptid)
			
			log.debug(stFunctionName,'END');
		}//updateAllItemReceipts end
		
		function updatePurchaseOrder(objPreviousTransactionLineLinkData,objItemReceiptData,objPurchaseOrderRecord) {
			var stFunctionName = 'updatePurchaseOrder';
			log.debug(stFunctionName,'START');
			
			var arrUpdatedPurchaseOrderLines = [];
			var objUpdatedPurchaseOrderLine = {};
			var blHasChanged = false;
			
			objItemReceiptData.itemrates.forEach(function(itemreceiptrate,itemreceiptindex){
				var flItemReceiptLineRate = itemreceiptrate;
				var intItemReceiptLine = itemreceiptindex + 1;
				var intPurchaseOrderLine;
				
				objPreviousTransactionLineLinkData.arrItemReceiptItemRateQueryResults.forEach(function(itemreceiptdata,index){
					if (objItemReceiptData.id == itemreceiptdata.nextdoc && intItemReceiptLine == itemreceiptdata.nextline) intPurchaseOrderLine = itemreceiptdata.previousline;
				});

				var intActualLine = objPurchaseOrderRecord.findSublistLineWithValue({
					sublistId: 'item',
					fieldId: 'line',
					value: parseInt(intPurchaseOrderLine)
				});

				var flPurchaseOrderLineRate = objPurchaseOrderRecord.getSublistValue({
					sublistId: 'item',
					fieldId: 'rate',
					line: intActualLine
				});
				if (flPurchaseOrderLineRate != flItemReceiptLineRate) {
					objPurchaseOrderRecord.selectLine({
						sublistId: 'item',
						line: intActualLine
					});
					objPurchaseOrderRecord.setCurrentSublistValue({
						sublistId: 'item',
						fieldId: 'rate',
						value: flItemReceiptLineRate
					});
					objPurchaseOrderRecord.commitLine({
						sublistId: 'item'
					});
					objUpdatedPurchaseOrderLine = {};
					objUpdatedPurchaseOrderLine.line = intPurchaseOrderLine;
					objUpdatedPurchaseOrderLine.rate = flItemReceiptLineRate;
					arrUpdatedPurchaseOrderLines.push(objUpdatedPurchaseOrderLine);
					blHasChanged = true;
				}//if (flPurchaseOrderLineRate != flItemReceiptLineRate) end
			});//objItemReceiptData.itemrates.forEach(function(itemreceiptrate,itemreceiptindex) end
			
			if (blHasChanged) var intPurchaseOrderId = objPurchaseOrderRecord.save();
			
			log.debug('arrUpdatedPurchaseOrderLines',JSON.stringify(arrUpdatedPurchaseOrderLines));
			
			log.debug(stFunctionName,'END');
		
			return arrUpdatedPurchaseOrderLines;
			
		}//updatePurchaseOrder end
		
		function updateOtherItemReceipts(objPreviousTransactionLineLinkData,arrUpdatedPurchaseOrderLines,intCurrentItemReceiptId) {
			var stFunctionName = 'updateOtherItemReceipts';
			log.debug(stFunctionName,'START');
			
			log.debug('intCurrentItemReceiptId',intCurrentItemReceiptId);
			
			objPreviousTransactionLineLinkData.arrItemReceiptIDs.forEach(function(itemreceiptid){
				if (itemreceiptid != intCurrentItemReceiptId) {
					var objItemReceiptRecord = record.load({
						type: record.Type.ITEM_RECEIPT,
						id: itemreceiptid,
						isDynamic: true
					});
					log.debug('itemreceiptid',itemreceiptid);
					var blHasChanged = false;
					objPreviousTransactionLineLinkData.arrItemReceiptItemRateQueryResults.forEach(function(itemreceiptdata,index){
						if (itemreceiptid == itemreceiptdata.nextdoc) {
							var intItemReceiptLine = itemreceiptdata.nextline - 1;
							log.debug('intItemReceiptLine',intItemReceiptLine);
							var flItemReceiptLineRate = objItemReceiptRecord.getSublistValue({
								sublistId: 'item',
								fieldId: 'rate',
								line: intItemReceiptLine
							});
							var flPurchaseOrderLineRate;
							arrUpdatedPurchaseOrderLines.forEach(function(purchaseorderdata,index){
								if (purchaseorderdata.line == itemreceiptdata.previousline) flPurchaseOrderLineRate = purchaseorderdata.rate;
							});
							log.debug('line',itemreceiptdata.nextline);
							log.debug('flPurchaseOrderLineRate',flPurchaseOrderLineRate);
							log.debug('flItemReceiptLineRate',flItemReceiptLineRate);
							if (flPurchaseOrderLineRate && flPurchaseOrderLineRate != flItemReceiptLineRate) {
								objItemReceiptRecord.selectLine({
									sublistId: 'item',
									line: intItemReceiptLine
								});
								objItemReceiptRecord.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'rate',
									value: flPurchaseOrderLineRate
								});
								objItemReceiptRecord.commitLine({
									sublistId: 'item'
								});
								blHasChanged = true;
							}//if (flPurchaseOrderLineRate != flItemReceiptLineRate) end
						}//if (itemreceiptid == itemreceiptdata.nextdoc) end
						
					});//objPreviousTransactionLineLinkData.arrItemReceiptItemRateQueryResults.forEach(function(itemreceiptdata,index) end
					
					if (blHasChanged) {
						log.debug('blHasChanged',blHasChanged);
						var intItemReceiptId = objItemReceiptRecord.save();
					}
					
				}//if (itemreceiptid != intCurrentItemReceiptId) end
				
			});//objPreviousTransactionLineLinkData.arrItemReceiptIDs.forEach(function(itemreceiptid)
			
			log.debug(stFunctionName,'END');
		}//updateOtherItemReceipts end

        return {
            afterSubmit: afterSubmit
        };
    });