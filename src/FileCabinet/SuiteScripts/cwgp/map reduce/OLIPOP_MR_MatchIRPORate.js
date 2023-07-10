/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

/**
 * Author: Erick Dela Rosa
 * Reference: 
 * Date: 14 November 2022
 * 
 *  Date Modified       Modified By                 Notes
 *  14 November 2022    Erick Dela Rosa             Initial Development
 * 
 * 
 */
define(['N/query', 'N/runtime', 'N/file', 'N/record', 'N/email', 'N/search', 'N/ui/serverWidget'],

    function(query, runtime, file, record, email, search, widget) {
   
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
		var objAppliedToTransactionTypeFilter = search.createFilter({
			name: 'type',
			join: 'appliedtotransaction',
			operator: search.Operator.ANYOF,
			values: ['PurchOrd']
		});
		var objAppliedToTransactionStatusFilter = search.createFilter({
			name: 'status',
			join: 'appliedtotransaction',
			operator: search.Operator.ANYOF,
			values: ['PurchOrd:E','PurchOrd:F','PurchOrd:D','PurchOrd:B'] //Purchase Order:Pending Billing/Partially Received, Purchase Order:Pending Bill, Purchase Order:Partially Received, Purchase Order:Pending Receipt
		});
		var objAppliedToTransactionQuantityFormulaFilter = search.createFilter({
			name: 'formulanumeric',
			operator: search.Operator.GREATERTHAN,
			formula: '{appliedtotransaction.quantity}-{appliedtotransaction.quantitybilled}',
			values: ['0']
		});
		var arrFilters = [objAppliedToTransactionTypeFilter,objAppliedToTransactionStatusFilter,objAppliedToTransactionQuantityFormulaFilter];
		
		//var arrPurchaseOrderIDs = [92257];
		var arrItemReceiptIDs = [396229];
		var objInternalIDFilter = search.createFilter({
			name: 'internalid',
			operator: search.Operator.ANYOF,
			//values: arrPurchaseOrderIDs
			values: arrItemReceiptIDs
		});
		//arrFilters.push(objInternalIDFilter);
		var objInternalIDColumn = search.createColumn('internalid');
		var objAppliedToTransactionColumn = search.createColumn({
			name: 'appliedtotransaction'
		});
		var objRateColumn = search.createColumn({
			name: 'rate'
		});
		var objLineColumn = search.createColumn({
			name: 'line'
		});
		var objLastModifiedDateColumn = search.createColumn({
			name: 'lastmodifieddate'
		});
		var objUnitColumn = search.createColumn({
			name: 'unit'
		});
		var objItemUnitsTypeColumn = search.createColumn({
			name: 'unitstype',
			join: 'item'
		});
		
		var arrColumns = [objInternalIDColumn,objAppliedToTransactionColumn,objRateColumn,objLineColumn,objLastModifiedDateColumn,objUnitColumn,objItemUnitsTypeColumn];
			
		var objItemReceiptSearch = search.create({
			type: search.Type.ITEM_RECEIPT,
			filters: arrFilters,
			columns: arrColumns
		});
		
		return objItemReceiptSearch;
    }//getInputData end
	
    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
		var objSearchResult = JSON.parse(context.value);
		//log.debug('objSearchResult',JSON.stringify(objSearchResult));
		//var intPurchaseOrderId = objSearchResult.id;
		var intPurchaseOrderId = objSearchResult.values.appliedtotransaction.value;
		var arrValues = objSearchResult.values;
		//log.debug('intPurchaseOrderId',intPurchaseOrderId);
		
		context.write({
			key: intPurchaseOrderId,
			value: arrValues
		});
    }//map end
	
    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {
		
		var intPurchaseOrderId = context.key;
		var arrSearchValues = context.values;
		//log.debug('arrSearchValues',arrSearchValues);
		
		//get array of item receipt lines
		var arrItemReceiptData = getItemReceiptData(arrSearchValues);
		
		//get purchase order lines
		var arrPurchaseOrderData = getPurchaseOrderData(intPurchaseOrderId);
		
		//create PO-Item Receipt line link
		var objPreviousTransactionLineLinkData = createPreviousTransactionLineLinkData(intPurchaseOrderId);
		
		//get sources of line updates
		var arrLineUpdateSources = getLineUpdateSources(intPurchaseOrderId,arrPurchaseOrderData,objPreviousTransactionLineLinkData,arrItemReceiptData);

		//get transactions to update
		var arrTransactionsToUpdate = getTransactionsToUpdate(objPreviousTransactionLineLinkData,arrLineUpdateSources);

		//update transactions
		if (arrTransactionsToUpdate.length > 0) {
			arrTransactionsToUpdate.forEach(function(transaction,transactionindex){
				var objTransactionRecord = record.load({
					type: transaction.type,
					id: transaction.id,
					isDynamic: true
				});
				
				transaction.arrLines.forEach(function(linedata,index) {
					var intActualLine = objTransactionRecord.findSublistLineWithValue({
						sublistId: 'item',
						fieldId: 'line',
						value: parseInt(linedata.line)
					});
					objTransactionRecord.selectLine({
						sublistId: 'item',
						line: intActualLine
					});
					objTransactionRecord.setCurrentSublistValue({
						sublistId: 'item',
						fieldId: 'rate',
						value: linedata.rate
					});
					objTransactionRecord.commitLine({
						sublistId: 'item'
					});
				});
				
				var intTransactionId = objTransactionRecord.save();
				
			});//arrTransactionsToUpdate.forEach(function(transaction,transactionindex) end
		}//if (arrTransactionsToUpdate.length > 0) end
		
		context.write({
			key: intPurchaseOrderId,
			value: arrTransactionsToUpdate
		});
    }//reduce end
	
	function getItemReceiptData(arrSearchValues){
		var stFunctionName = 'getItemReceiptData';
		log.debug(stFunctionName,'START');
		
		var arrItemReceiptData = [];
		var objItemReceiptData = {};
		
		arrSearchValues.forEach(function(itemreceiptdata,index){
			var stParsedData = JSON.parse(itemreceiptdata);
			//log.debug('stParsedData',stParsedData);
			var flItemRate = stParsedData.rate;
			var stUnit = stParsedData.unit;
			var intUnitsType = stParsedData["unitstype.item"].value;
			var flActualRate = getActualRate(flItemRate,stUnit,intUnitsType);
			
			objItemReceiptData = {};
			objItemReceiptData.internalid = stParsedData.internalid.value;
			objItemReceiptData.line = stParsedData.line;
			objItemReceiptData.rate = flActualRate;
			objItemReceiptData.lastmodifieddate = stParsedData.lastmodifieddate;
			objItemReceiptData.unitstype = intUnitsType;
			arrItemReceiptData.push(objItemReceiptData);
		});
		
		log.debug('arrItemReceiptData',JSON.stringify(arrItemReceiptData));
		
		log.debug(stFunctionName,'END');
		return arrItemReceiptData;
	}//getItemReceiptData end
	
	function getActualRate(flItemRate,stUnit,intUnitsType) {
		var stFunctionName = 'getActualRate';
		//log.debug(stFunctionName,'START');
		
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
		
		//log.debug(stFunctionName,'END');
		return flActualRate;
	}//getActualRate end
	
	function getPurchaseOrderData(intPurchaseOrderId) {
		var stFunctionName = 'getPurchaseOrderData';
		log.debug(stFunctionName,'START');
		
		var objMainlineFilter = search.createFilter({
			name: 'mainline',
			operator: search.Operator.IS,
			values: ['F']
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
		//filter to exclude purchase orders with purchase contract and purchase orders with blanket purchase order
		var objAppliedToTransactionTypeFilter = search.createFilter({
			name: 'type',
			join: 'appliedtotransaction',
			operator: search.Operator.NONEOF,
			values: ['PurchCon','BlankOrd']
		});
		var arrFilters = [objMainlineFilter,objStatusFilter,objQuantityFormulaFilter,objAppliedToTransactionTypeFilter];
		var arrPurchaseOrderIDs = [intPurchaseOrderId];
		var objInternalIDFilter = search.createFilter({
			name: 'internalid',
			operator: search.Operator.ANYOF,
			values: arrPurchaseOrderIDs
		});
		arrFilters.push(objInternalIDFilter);
		var objRateColumn = search.createColumn({
			name: 'rate'
		});
		var objLineColumn = search.createColumn({
			name: 'line'
		});
		var objLastModifiedDateColumn = search.createColumn({
			name: 'lastmodifieddate'
		});
		var objUnitColumn = search.createColumn({
			name: 'unit'
		});
		var objItemUnitsTypeColumn = search.createColumn({
			name: 'unitstype',
			join: 'item'
		});
		
		var arrColumns = [objRateColumn,objLineColumn,objLastModifiedDateColumn,objUnitColumn,objItemUnitsTypeColumn];
			
		var objPurchaseOrderSearch = search.create({
			type: search.Type.PURCHASE_ORDER,
			filters: arrFilters,
			columns: arrColumns
		});
		
		var arrPurchaseOrderData = [];
		var objPurchaseOrderData = {};
		
		objPurchaseOrderSearch.run().each(function(result){
			var flItemRate = result.getValue(objRateColumn);
			var intLine = result.getValue(objLineColumn);
			var stLastModifiedDate = result.getValue(objLastModifiedDateColumn);
			var stUnit = result.getValue(objUnitColumn);
			var intUnitsType = result.getValue(objItemUnitsTypeColumn);
			var flActualRate = getActualRate(flItemRate,stUnit,intUnitsType);
			
			objPurchaseOrderData = {};
			objPurchaseOrderData.rate = flActualRate;
			objPurchaseOrderData.line = intLine;
			objPurchaseOrderData.lastmodifieddate = stLastModifiedDate;
			arrPurchaseOrderData.push(objPurchaseOrderData);
			
			return true;
		});
		
		log.debug('arrPurchaseOrderData',arrPurchaseOrderData);
		
		log.debug(stFunctionName,'END');
		return arrPurchaseOrderData;
	}//getPurchaseOrderData end

	function createPreviousTransactionLineLinkData(intPurchaseOrderId) {
		var stFunctionName = 'createPreviousTransactionLineLinkData';
		log.debug(stFunctionName,'START');
		
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

	function getLineUpdateSources(intPurchaseOrderId,arrPurchaseOrderData,objPreviousTransactionLineLinkData,arrItemReceiptData) {
		var stFunctionName = 'getLineUpdateSources';
		log.debug(stFunctionName,'START');
		
		var arrLineUpdateSources = [];
		arrPurchaseOrderData.forEach(function(purchaseorderdata,purchaseorderindex){
			var flPurchaseOrderLineRate = purchaseorderdata.rate;
			var stPurchaseOrderLastModifiedDate = purchaseorderdata.lastmodifieddate;
			var intPurchaseOrderLine = purchaseorderdata.line;
			
			//log.debug('intPurchaseOrderLine',intPurchaseOrderLine);
			//log.debug('flPurchaseOrderLineRate',flPurchaseOrderLineRate);
			
			var arrRelatedItemReceipts = [];
			objPreviousTransactionLineLinkData.arrItemReceiptItemRateQueryResults.forEach(function(itemreceiptdata,itemreceiptdataindex){
				if (intPurchaseOrderLine == itemreceiptdata.previousline) {
					var objRelatedItemReceipt = {};
					objRelatedItemReceipt.itemreceiptid = itemreceiptdata.nextdoc;
					objRelatedItemReceipt.line = itemreceiptdata.nextline;
					arrRelatedItemReceipts.push(objRelatedItemReceipt);
				}
			});//objPreviousTransactionLineLinkData.arrItemReceiptItemRateQueryResults.forEach(function(itemreceiptdata,index) end
			
			//log.debug('arrRelatedItemReceipts',arrRelatedItemReceipts);
			
			arrItemReceiptData.forEach(function(itemreceiptdata,itemreceiptdataindex){
				var flItemReceiptLineRate = itemreceiptdata.rate;
				var stItemReceiptLastModifiedDate =  itemreceiptdata.lastmodifieddate;
				var intItemReceiptLine = itemreceiptdata.line;
				var intItemReceiptId = itemreceiptdata.internalid;
				
				//log.debug('intItemReceiptId',intItemReceiptId);
				//log.debug('intItemReceiptLine',intItemReceiptLine);
				//log.debug('flItemReceiptLineRate',flItemReceiptLineRate);
				
				var intRelatedItemReceiptIndex = -1;
				arrRelatedItemReceipts.forEach(function(relateditemreceipt,relatedindex){
					if (relateditemreceipt.itemreceiptid == intItemReceiptId && relateditemreceipt.line == intItemReceiptLine) intRelatedItemReceiptIndex = relatedindex;
				});
				
				var intLineUpdateSourcesIndex = -1;
				arrLineUpdateSources.forEach(function(linedata,index){
					if (linedata.purchaseorderline == intPurchaseOrderLine) intLineUpdateSourcesIndex = index;
				});
				
				//log.debug('intRelatedItemReceiptIndex',intRelatedItemReceiptIndex);
				//log.debug('intLineUpdateSourcesIndex',intLineUpdateSourcesIndex);
				if (intRelatedItemReceiptIndex != -1) {
					if (flPurchaseOrderLineRate != flItemReceiptLineRate) {
						var intId, intLine, flRate, stType;
						var dtPurchaseOrderDate = new Date(stPurchaseOrderLastModifiedDate);
						var dtItemReceiptDate = new Date(stItemReceiptLastModifiedDate);
						//log.debug('dtPurchaseOrderDate',dtPurchaseOrderDate);
						//log.debug('dtItemReceiptDate',dtItemReceiptDate);
						if (dtPurchaseOrderDate > dtItemReceiptDate) {
							intId = intPurchaseOrderId;
							intLine = intPurchaseOrderLine;
							flRate = flPurchaseOrderLineRate;
							stType = record.Type.PURCHASE_ORDER;
						} else {
							intId = intItemReceiptId;
							intLine = intItemReceiptLine;
							flRate = flItemReceiptLineRate;
							stType = record.Type.ITEM_RECEIPT;
						}
						//log.debug('intId',intId);
						//log.debug('intLine',intLine);
						//log.debug('flRate',flRate);
						//log.debug('stType',stType);
						
						if (intLineUpdateSourcesIndex == -1) {
							var objLineSource = {};
							objLineSource.purchaseorderline = intPurchaseOrderLine;
							objLineSource.id = intId;
							//objLineSource.line = intLine - 1;
							objLineSource.line = intLine;
							objLineSource.rate = flRate;
							arrLineUpdateSources.push(objLineSource);
							
						} else {
							arrLineUpdateSources[intLineUpdateSourcesIndex].id = intId;
							//arrLineUpdateSources[intLineUpdateSourcesIndex].line = intLine - 1;
							arrLineUpdateSources[intLineUpdateSourcesIndex].line = intLine;
							arrLineUpdateSources[intLineUpdateSourcesIndex].rate = flRate;
						}						

					}//if (flPurchaseOrderLineRate != flItemReceiptLineRate) end
				}//if (intRelatedItemReceiptIndex != -1) end
				
			});//arrItemReceiptData.forEach(function(itemreceiptdata,itemreceiptdataindex) end
		});//arrPurchaseOrderData.forEach(function(purchaseorderdata,purchaseorderindex) end
		
		log.debug('arrLineUpdateSources',arrLineUpdateSources);
		
		log.debug(stFunctionName,'END');
		
		return arrLineUpdateSources;
	}//getLineUpdateSources end 

	function getTransactionsToUpdate(objPreviousTransactionLineLinkData,arrLineUpdateSources) {
		var stFunctionName = 'getTransactionsToUpdate';
		log.debug(stFunctionName,'START');
		
		var arrTransactionsToUpdate = [];		

		if (arrLineUpdateSources.length > 0) {
		
			objPreviousTransactionLineLinkData.arrItemReceiptItemRateQueryResults.forEach(function(itemreceiptdata,itemreceiptdataindex){
				var intPurchaseOrderLine = itemreceiptdata.previousline;
				var intPurchaseOrderId = itemreceiptdata.previousdoc;
				var intItemReceiptId = itemreceiptdata.nextdoc;
				var intItemReceiptLine = itemreceiptdata.nextline;

				arrLineUpdateSources.forEach(function(linesource,index){
					if (linesource.purchaseorderline == intPurchaseOrderLine) {
						var intTransactionId = intItemReceiptId;
						var intLine = intItemReceiptLine;
						var stType = record.Type.ITEM_RECEIPT;
						if (linesource.id == intItemReceiptId) {
							intTransactionId = intPurchaseOrderId;
							intLine = intPurchaseOrderLine;
							stType = record.Type.PURCHASE_ORDER;
						}

						var intTransactionToUpdateIndex = -1;
						arrTransactionsToUpdate.forEach(function(transaction,index){
							if (transaction.id == intTransactionId) intTransactionToUpdateIndex = index;
						});

						var objLineToUpdate = {};
						objLineToUpdate.line = intLine;
						objLineToUpdate.rate = linesource.rate;

						if (intTransactionToUpdateIndex == -1) {
							var objTransactionToUpdate = {};
							objTransactionToUpdate.id = intTransactionId;
							objTransactionToUpdate.type = stType;
							objTransactionToUpdate.arrLines = [];
							objTransactionToUpdate.arrLines.push(objLineToUpdate);
							arrTransactionsToUpdate.push(objTransactionToUpdate);
						} else {
							arrTransactionsToUpdate[intTransactionToUpdateIndex].arrLines.push(objLineToUpdate);
						}

						
					}
				});//arrLineUpdateSources.forEach(function(linesource,index) end

			});//objPreviousTransactionLineLinkData.arrItemReceiptItemRateQueryResults.forEach(function(itemreceiptdata,index) end
		}//if (arrLineUpdateSources.length > 0) end

		log.debug('arrTransactionsToUpdate',arrTransactionsToUpdate);
		
		log.debug(stFunctionName,'END');
		
		return arrTransactionsToUpdate;
	}//createPreviousTransactionLineLinkData end

    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {
		
		var arrItemReceipt = [];
		summary.mapSummary.keys.iterator().each(function (key){
			arrItemReceipt.push(key);
			return true;
		});

		log.debug('arrItemReceipt count',arrItemReceipt.length);
		log.debug({
			title: 'Item Receipt list',
			details: arrItemReceipt
		});
		
		var intTotal = 0;
		var arrPurchaseOrder = [];
		var arrSearchValues = [];
		summary.output.iterator().each(function (key, value){
			arrPurchaseOrder.push(key);
			arrSearchValues.push(JSON.parse(value));
			intTotal += JSON.parse(value).length;
			return true;
		 });

		log.debug('Total records processed', intTotal);
		log.debug('Purchase Order list', arrPurchaseOrder);
		log.debug('arrSearchValues list', arrSearchValues);
    }//summarize end

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});