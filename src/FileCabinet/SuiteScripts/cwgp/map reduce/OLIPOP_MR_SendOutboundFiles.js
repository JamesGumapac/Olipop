/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/email', 'N/file', 'N/record', 'N/render', 'N/runtime', 'N/search'],
    /**
 * @param{email} email
 * @param{file} file
 * @param{record} record
 * @param{render} render
 * @param{runtime} runtime
 * @param{search} search
 */
    (email, file, record, render, runtime, search) => {
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
                let script = runtime.getCurrentScript();
                let scriptDeployment = script.deploymentId
                let searchId = script.getParameter({name: 'custscript_cwgp_ss_outboundfilestosend'});
                let intFolderId = script.getParameter({name: 'custscript_cwgp_outboundfolder'});
                let objFileSearch = search.load({
                    id: searchId,
                    type: search.Type.FOLDER
                });
                objFileSearch.filters.push(search.createFilter({
                    name: 'internalidnumber',
                    operator: search.Operator.EQUALTO,
                    values: intFolderId
                }));

                log.debug('objFileSearch.filters', objFileSearch.filters);

                let intSearchCount = objFileSearch.runPaged({
                    pageSize: 50
                }).count;
                log.debug('intSearchCount', intSearchCount);
                if(intSearchCount !== 0){
                    let objFolderFiles = {}
                    let arrFileIds = []
                    objFileSearch.run().each((result)=>{
                        // let intFolderName = result.getValue({
                        //     name: 'name'
                        // });
                        let intFileNameId = result.getValue({
                            name: 'internalid',
                            join: 'file'
                        });
                        log.debug('intFileNameId', intFileNameId)
                        arrFileIds.push(intFileNameId);
                        return true;
                    });
                    objFolderFiles[scriptDeployment] = arrFileIds;
                    log.debug('objFolderFiles', objFolderFiles);
                    return objFolderFiles;
                }
                
            } catch (error) {
                log.debug('Unexpected Error at Get Input Stage', error.message);
            }
            
        }

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @since 2015.2
         */

        const map = (mapContext) => {
            try {
                let script = runtime.getCurrentScript();
                let intProcessedFolderId = script.getParameter({name: 'custscript_cwgp_outboundprocessedfolder'});
                //let stFolderName = mapContext.key;
                let arrFileIds = JSON.parse(mapContext.value);    
                log.debug('intProcessedFolderId', intProcessedFolderId);
                log.debug('arrFileIds', arrFileIds); 
                if(arrFileIds){
                    for(let key in arrFileIds){
                        let objFileToSend = file.copy({
                            folder: intProcessedFolderId,
                            id: parseInt(arrFileIds[key]),
                            conflictResolution: file.NameConflictResolution.RENAME_TO_UNIQUE    
                        })//.save(); 
                        sendEmail(objFileToSend);
                    }
                }
                
            } catch (error) {
               log.debug('Unexpected Error at Map Stage', error.message) 
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
        function sendEmail(objFile){
            
            let stEmailBody = 'See transaction attached.'
            let stEmailSubject = 'Test'

            email.send({
                author: 433710,
                body: stEmailBody,
                recipients: 'cmsy@cwglobalpartners.com',
                subject: stEmailSubject,
                attachments: [objFile]
                // relatedRecords: {
                //     transactionId: stInternalId
                // }
                // bcc: number[] | string[],
                // cc: number[] | string[],
                // isInternalOnly: boolean,
                // replyTo: string
            });
        } //sendEmail end
        return {getInputData, map, reduce, summarize}

    });
