/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

/** 
* Author: CWGP
* Date: 19 Jan 2024
* 
*  Date Modified       Modified By                 Notes
*  19 Jan 2024         CWGP                        Initial Deployment
*  12 Apr 2024         CWGP                        Added support for SO Fulfillment
*/

var __CONFIG = {
    ENABLE_LOG : true,
    EMAIL : {
        AUTHOR: 1795003, //PROD: 1795003 SB: 433710
        BODY: 'See transaction attached',//PROD: See transaction attached. SB: See transaction attached. 
        SUBJECT:'Olipop Integration Message',//PROD: Olipop Integration Message SB: Test
        RECEPIENT:'olipop@drinkoctopi.com'//PROD: olipop@drinkoctopi.com SB:mcallado@cwglobalpartners.com,nyang@cwglobalpartners.com
    },
    PARAMETERS: {
        SEARCH_ID: 'custscript_cwgp_ss_outboundfilestosend', //PROD:custscript_cwgp_ss_outboundfilestosend SB:
        FOLDER_ID: 'custscript_cwgp_outboundfolder', //PROD:custscript_cwgp_outboundfolder SB:
        PROCESSED_FOLDER_ID: 'custscript_cwgp_outboundprocessedfolder',// PROD:custscript_cwgp_outboundprocessedfolder SB:,
        EMAIL_PREFIX_ID: 'custscript_cwgp_emailsubjectprefix'// PROD:custscript_cwgp_emailsubjectprefix SB:
    },
    
};

var OBJ_RECORD = {
    FOLDER : {
        ID: 'folder',
        FIELDS: {
            FILE_ID: 'internalid.file',
            FILE_NAME: 'name.file'
        }

    },
    AUTONUMBER_OCTOPI_EMAIL: {
        ID : {
            TO_FULFILLING: 'customrecord_cwgp_autono_octopi_em_tof',
            PO_OUTSOURCE: 'customrecord_cwgp_autono_octopi_em_poo',
            PO_STANDALONE: 'customrecord_cwgp_autono_octopi_em_pos',
            TO_RECEIVING: 'customrecord_cwgp_autono_octopi_em_tor',
            WO:'customrecord_cwgp_autono_octopi_em_wo' 
        },
        FIELDS : {
            NAME: 'name',
            INTERNAL_ID: 'internalid',
            ID: 'ID'
        } 
    }
};
/** Deployments - Custom Record Counterparts**/

var OBJ_DEPLOYMENTS = {
    customdeploy_cwgp_mr_octopi_sendout_tof: 'customrecord_cwgp_autono_octopi_emob_tof',
    customdeploy_cwgp_mr_octopi_sendout_poo: 'customrecord_cwgp_autono_octopi_emob_poo',
    customdeploy_cwgp_mr_octopi_sendout_pos: 'customrecord_cwgp_autono_octopi_emob_pos',
    customdeploy_cwgp_mr_octopi_sendout_tor: 'customrecord_cwgp_autono_octopi_emob_tor',
    customdeploy_cwgp_mr_octopi_sendout_wo: 'customrecord_cwgp_autono_octopi_emob_wo',
    customdeploy_cwgp_mr_octopi_sendout_sof: 'customrecord_cwgp_autono_octopi_emob_sof'
}



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

        const getInputData = (inputContext) => {
            let strLogName = 'getInputData';    
            log.debug(strLogName, '-----START-----');
            try {
                let script = runtime.getCurrentScript();
                let scriptDeployment = script.deploymentId
                let intSearchId = script.getParameter({name: __CONFIG.PARAMETERS.SEARCH_ID})||false;
                let intFolderId = script.getParameter({name: __CONFIG.PARAMETERS.FOLDER_ID})||false;
                if(intSearchId&&intFolderId){if(__CONFIG.ENABLE_LOG){log.debug(strLogName, ' Deployment ID  | '+ scriptDeployment); log.debug(strLogName, ' Search ID  | '+ intSearchId); log.debug(strLogName, ' Source Folder ID  | '+ intFolderId);}let objFileResultSet = searchFiles(intSearchId, intFolderId); log.debug(strLogName, '-----END-----'); return objFileResultSet} else { log.debug(strLogName, '-----END-----');return {};}                  
            } catch (error) {
                log.error(strLogName, error.message);
            }
        }

        const map = (mapContext) => {
            let strLogName = 'map'; 
            log.debug(strLogName, '-----START-----');
            try {
                let script = runtime.getCurrentScript();
                let scriptDeployment = script.deploymentId
                let intProcessedFolderId = script.getParameter({name: __CONFIG.PARAMETERS.PROCESSED_FOLDER_ID});
                let objFileRec = JSON.parse(mapContext.value);
                let intFileId = JSON.parse(mapContext.value).values[OBJ_RECORD.FOLDER.FIELDS.FILE_ID].value || false;
                let strFileName = JSON.parse(mapContext.value).values[OBJ_RECORD.FOLDER.FIELDS.FILE_NAME] || false;
                if(__CONFIG.ENABLE_LOG){log.debug(strLogName, ' File Record  | ' + JSON.stringify(objFileRec));} log.debug(strLogName, ' File ID Length | ' + intFileId.length); log.debug(strLogName, ' File ID  | ' + intFileId); log.debug(strLogName, ' File Name  | ' + strFileName); if(__CONFIG.ENABLE_LOG){log.debug(strLogName, ' Destination Folder ID  | '+ intProcessedFolderId);}
                let objFileToEmail =  transferFile(intFileId,intProcessedFolderId);
                sendEmail(objFileToEmail,scriptDeployment);
                if(objFileToEmail){if(__CONFIG.ENABLE_LOG){log.debug(strLogName,'File to Delete: ' + intFileId);} file.delete({ id: parseInt(intFileId)});}
            } catch (error) {
                log.error(strLogName, error.message);
            }
            log.debug(strLogName, '-----END-----');
        }

        const reduce = (reduceContext) => {
            let strLogName = 'reduce'; 
        }

        const summarize = (summaryContext) => {
            let strLogName = 'summarize'; 
        }
        /** Function that will search available files on specified folder **/
        const searchFiles = (intSearchId, intFolderId) => {
            let strLogName = 'searchFiles'; 
            try {                
                let objFileSearch = search.load({
                    id: intSearchId,
                    type: search.Type.FOLDER
                });
                objFileSearch.filters.push(search.createFilter({name: 'internalidnumber',operator: search.Operator.EQUALTO,values: intFolderId}));
                if(__CONFIG.ENABLE_LOG){log.debug(strLogName, ' Search Filter  | ' + JSON.stringify(objFileSearch.filters));}
                let intSearchCount = objFileSearch.runPaged({pageSize: 50}).count;
                let objFirstFile =  objFileSearch.run().getRange({start:0, end:1})[0];
                log.debug(strLogName, 'First Record: |' + JSON.stringify(objFirstFile)); log.debug(strLogName, 'First Record ID: |' + objFirstFile.getValue({name: 'internalid',join: 'file'}));
                let intFirstFileId = objFirstFile.getValue({name: 'internalid',join: 'file'}) || false;
                /** Checks if the folder contains a file. If none, skip **/
                if(intFirstFileId){log.debug(strLogName, ' Number of Files  | ' + intSearchCount); return objFileSearch;} else {log.debug(strLogName, ' Folder is Empty  '); return {};}
            } catch (error){
                log.error(strLogName, error.message);
            }
        }
        /** Function that will transfer processed file from pending to processed folder **/
        const transferFile = (intFileId, intProcessedFolderId) => {
            let strLogName = 'transferFile'; 
            try { 
                let objFileToSend = file.copy({
                    folder: parseInt(intProcessedFolderId),
                    id: parseInt(intFileId),
                    conflictResolution: file.NameConflictResolution.RENAME_TO_UNIQUE    
                })//.save(); 
                return objFileToSend;
            } catch (error){
                log.error(strLogName, error.message);
            }
        }
        /** Function that will get current autonumbering **/
        const getAutoNum = (strRecordType) => {
            let strLogName = 'getAutoNum'; 
            let intCurrentNumber;
            let intNewNumber;
            try {
                /** Search for existing autonumber record **/
                var customrecord_cwgp_autonumber_octopemailSearchObj = search.create({
                    type: strRecordType,
                    filters:
                    [
                    ],
                    columns:
                    [
                       search.createColumn({
                          name: "name",
                          sort: search.Sort.ASC,
                          label: "Name"
                       }),
                       search.createColumn({name: "internalid", label: "Internal ID"})
                    ]
                 });    
                 var searchResultCount = customrecord_cwgp_autonumber_octopemailSearchObj.runPaged().count;
                 log.debug("customrecord_cwgp_autonumber_octopemailSearchObj result count",searchResultCount);
                 /** Depending on the count of autorecord that will be retrieved**/
                 if(searchResultCount > 0){
                    let objAutoNumber = customrecord_cwgp_autonumber_octopemailSearchObj.run().getRange({start:0, end:1})[0];
                    let intAutoNumberId = objAutoNumber.getValue({name:OBJ_RECORD.AUTONUMBER_OCTOPI_EMAIL.FIELDS.INTERNAL_ID});
                    intCurrentNumber = objAutoNumber.getValue({name:OBJ_RECORD.AUTONUMBER_OCTOPI_EMAIL.FIELDS.NAME});
                    if(__CONFIG.ENABLE_LOG){log.debug(strLogName, ' Autonumber ID  | ' + intAutoNumberId);log.debug(strLogName, ' Autonumber Current Number   | ' + intCurrentNumber);}
                    /** Delete New **/
                    record.delete({type:strRecordType,id:intAutoNumberId});
                    /** Create New **/
                    let objNewAutoNumber = record.create({type: strRecordType,isDynamic: true});
                    objNewAutoNumber.save();
                 } else {
                    /** Create New **/
                    let objNewAutoNumber = record.create({type: strRecordType,isDynamic: true});
                    let intNewAutoNumberId = objNewAutoNumber.save();
                    var searchResultCount = 0;
                    //While start
                    while (searchResultCount < 1) {
                        var customrecord_cwgp_autonumber_octopemailSearchObj = search.create({
                            type: strRecordType,
                            filters:
                            [
                            ["internalid","is",intNewAutoNumberId]
                            ],
                            columns:
                            [
                            search.createColumn({
                                name: "name",
                                sort: search.Sort.ASC,
                                label: "Name"
                            }),
                            search.createColumn({name: "internalid", label: "Internal ID"})
                            ]
                        });
                        searchResultCount = customrecord_cwgp_autonumber_octopemailSearchObj.runPaged().count;
                        log.debug("customrecord_cwgp_autonumber_octopemailSearchObj result count",searchResultCount);
                    }
                     //while end
                     let objAutoNumber = customrecord_cwgp_autonumber_octopemailSearchObj.run().getRange({start:0, end:1})[0];
                     intCurrentNumber = objAutoNumber.getValue({name:OBJ_RECORD.AUTONUMBER_OCTOPI_EMAIL.FIELDS.NAME});
                     if(__CONFIG.ENABLE_LOG){log.debug(strLogName, ' Autonumber ID  | ' + intNewAutoNumberId);log.debug(strLogName, ' Autonumber Current Number   | ' + intCurrentNumber);}
                 }
                return intCurrentNumber;
            } catch (error){
                log.error(strLogName, error.message);
            }
        }
        /** Function that will notify users with processed file attached **/
        const sendEmail = (objFile,strDeploymentId) => {
            let strLogName = 'sendEmail'; 
            try {
                let stEmailBody = __CONFIG.EMAIL.BODY;
                let stEmailSubject = __CONFIG.EMAIL.SUBJECT
                let objScript = runtime.getCurrentScript();
                let stPrefix = objScript.getParameter({name: __CONFIG.PARAMETERS.EMAIL_PREFIX_ID})||false;
                if(stPrefix){let intAutoNumber = getAutoNum(OBJ_DEPLOYMENTS[strDeploymentId]); stEmailSubject = stPrefix + intAutoNumber + '_' +stEmailSubject}
                email.send({
                    author: __CONFIG.EMAIL.AUTHOR,
                    body: stEmailBody,
                    recipients: __CONFIG.EMAIL.RECEPIENT,
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

                log.debug(strLogName, 'Send Email Completed') 
            } catch (error) {
                log.error(strLogName, error.message);
            }
           
        } 
        return {getInputData, map, reduce, summarize}

    });