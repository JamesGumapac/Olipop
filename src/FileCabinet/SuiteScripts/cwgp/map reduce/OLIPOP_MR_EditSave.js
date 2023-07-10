/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

/**
 * Author: Erick Dela Rosa
 * Reference: 
 * Date: 20 Feb 2023
 * 
 *  Date Modified       Modified By                 Notes
 *  20 Feb 2023         Erick Dela Rosa             Initial Development
 * 
 * 
 */
define(['N/query', 'N/runtime', 'N/file', 'N/record', 'N/email', 'N/search', 'N/ui/serverWidget', 'N/format','N/render'],

function(query, runtime, file, record, email, search, widget,format,render) {
	
	var intTransactionSearchID = 2351;
   
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
		
		var arrTransactionIDs = getTransactionIDs();
		
		return arrTransactionIDs;
    }//getInputData end
	
	function getTransactionIDs() {
		var stFunctionName = 'getTransactionIDs';
		log.debug(stFunctionName,'START');
		
		var objTransactionSearch = search.load(intTransactionSearchID);
		
		var arrTransactionIDs = [];
		
		var objPagedData = objTransactionSearch.runPaged();
		objPagedData.pageRanges.forEach(function(pageRange){
			var objPage = objPagedData.fetch({index: pageRange.index});
			objPage.data.forEach(function(result){
				
				arrTransactionIDs.push(result.id);
				
			});//objPage.data.forEach(function(result) end
		});//objPagedData.pageRanges.forEach(function(pageRange) end
		
		log.debug(stFunctionName,'END');
		
		return arrTransactionIDs;
	}//getTransactionIDs end
	
    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
		var stTransactionID = JSON.parse(context.value);
		//log.debug('stTransactionID',stTransactionID);
		
		var intTransactionID = parseInt(stTransactionID);
		var intRemainder = intTransactionID % 2;
		
		context.write({
			key: String(intRemainder),
			value: stTransactionID
		});
    }//map end
	
    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {
		
		var arrSearchValues = context.values;
		log.debug('arrSearchValues',arrSearchValues);
		
		var arrUpdatedTransactions = [];
		
		arrSearchValues.forEach(function(transactionid){
			var stTransactionID = JSON.parse(transactionid);
			var objTransaction = record.load(stTransactionID);
			var intTransactionID = objTransaction.save();
			arrUpdatedTransactions.push(intTransactionID);
		});
		
		context.write({
			key: context.key,
			value: arrUpdatedTransactions
		});
    }//reduce end

    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {
		
		var intMapErrorCount = 0;
		summary.mapSummary.errors.iterator().each(
			function (key, error, executionNo) {
				var errorObject = JSON.parse(error);
				log.error({
					   title:  'Map error for key: ' + key + ', execution no. ' + executionNo,
					details: errorObject.name + ': ' + errorObject.message
				});
				intMapErrorCount++;
				return true;
			}
		);
		log.debug('map error count', intMapErrorCount);
		var intReduceErrorCount = 0;
		summary.reduceSummary.errors.iterator().each(
			function (key, error, executionNo) {
				var errorObject = JSON.parse(error);
				log.error({
					   title:  'Reduce error for key: ' + key + ', execution no. ' + executionNo,
					details: errorObject.name + ': ' + errorObject.message
				});
				intReduceErrorCount++;
				return true;
			}
		);
		log.debug('reduce error count', intReduceErrorCount);
		
		var intTransactionTotal = 0;
		var arrUpdatedTransactions = [];
		summary.output.iterator().each(function (key, value){
			arrUpdatedTransactions.push(JSON.parse(value));
			intTransactionTotal += JSON.parse(value).length;
			return true;
		 });

		log.debug('Total transaction processed', intTransactionTotal);
		log.debug('arrUpdatedTransactions list', arrUpdatedTransactions);
    }//summarize end

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});