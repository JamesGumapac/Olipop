/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/runtime', 'N/search'],
    /**
     * @param{record} record
     * @param{runtime} runtime
     * @param{search} search
     */
    (record, runtime, search) => {
        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */
        const getInputData = (inputContext) => {
            try {
                log.audit("GET INPUT DATA")
                const searchId = runtime.getCurrentScript().getParameter("custscript_cwgp_transaction_search")
                log.debug("searchId", searchId)
                return search.load({
                    id: searchId
                })
            } catch (e) {
                log.error("getInputData", e.message)
            }
        }
        /**
         * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
         * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
         * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
         *     reduce function on the current group
         * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
         * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} reduceContext.key - Key to be processed during the reduce stage
         * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
         *     for processing
         * @since 2015.2
         */
        const reduce = (reduceContext) => {
            let reduceObj = JSON.parse(reduceContext.values)
            try {
                log.debug("reduceContext", reduceObj)
                const replaceMentCusstomerId = runtime.getCurrentScript().getParameter("custscript_cwgp_change_to");


                /* SUGGESTED SOLUTION BY

                NETSUITE SUPPORT

                */

                //Scenario 1: When transction is an invoice
                if (reduceObj.recordType == "invoice") {

                    //Scenario 1.1: When Created From value is not null or empty. When Invoice is not standalone
                    log.debug("SalesOrderLocation " ,reduceObj.createdFrom.location.value )
                    if (reduceObj.createdFrom.location.value != '' && reduceObj.createdFrom.location.value != null) {

                        record.submitFields({
                            type: reduceObj.recordType,
                            id: reduceObj.id,
                            values: {
                                "entity": replaceMentCusstomerId,
                                "location": reduceObj.createdFrom.location.value,
                            },
                            ignoreMandatoryFields: true
                        });
                    } else {

                        //Scenario 1.2: When the invoice is a standalone or no location set in the Sales Order record.


                        record.submitFields({
                            type: reduceObj.recordType,
                            id: reduceObj.id,
                            values: {
                                "entity": replaceMentCusstomerId,
                                "location": 111,
                            },
                            ignoreMandatoryFields: true
                        });
                    }

                    //Scenario 2: When transaction is Journal.

                } else if (reduceObj.recordType == "journalentry") {
                    var journalObj = record.load({
                        type: record.Type.JOURNAL_ENTRY,
                        id: reduceObj.id

                    });
                    const totalLine = journalObj.getLineCount({
                        sublistId: "line"
                    });
                    for (let i = 0; i < totalLine; i++) {
                        let entityToChange = journalObj.getSublistValue({
                            sublistId: 'line',
                            fieldId: 'entity',
                            line: i,
                            value: replaceMentCusstomerId
                        });
                        if (entityToChange == 831) { //10007 UNFI GREENWOOD
                            journalObj.setSublistValue({
                                sublistId: 'line',
                                fieldId: 'entity',
                                line: i,
                                value: replaceMentCusstomerId
                            });
                        }
                    }
                    journalObj.save();


                }
            } catch (e) {
                log.error("reduce", {error: e.message, type: reduceObj.recordType, id: reduceObj.id})
            }
        }
        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
         * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
         * @param {Object} summaryContext.inputSummary - Statistics about the input stage
         * @param {Object} summaryContext.mapSummary - Statistics about the map stage
         * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
         * @since 2015.2
         */
        const summarize = (summaryContext) => {
        }
        return {getInputData, reduce, summarize}
    });
