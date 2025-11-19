//OPOP_SL_SendEmailStatus.js

/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

/**
*  Date     : 23 March 2023
*  Author   : Jaira Ryea Molina
* 
*  Date Modified       Modified By             Notes
*  23 March 2023      Jaira Ryea Molina       Initial Version
*/

 var SL_OBJ = {
    MAIN    : {
        FORM        : 'Bulk Email to Vendors',
        STATUS      : 'custpage_main_status',
        ERROR       : 'custpage_main_inlinehtml',
        STATUSPAGE  : 'custpage_main_statuspage'
    },
    SUBLIST : {
        ID          : 'custpage_sublist_id',
        STATUS      : 'custpage_sublist_status',
        PERCENTAGE  : 'custpage_sublist_percentage',
        PROCESSING  : 'custpage_sublist_processing',
        STAGE       : 'custpage_sublist_stage',
    }
};

var __CONFIG = {
    //OPOP_CS_SendEmailStatus.js
    CS_PATH : '183954' //PROD
           // '64996' //SB 
};

var LOG_NAME;


define(['N/runtime', 'N/task', 'N/ui/serverWidget'],
/**
 * @param {runtime} runtime
 * @param {task} task
 * @param {serverWidget} serverWidget
 */
function(runtime, task, serverWidget) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {
    	
        if(context.request.method === 'GET') {
            try {
                LOG_NAME = 'getMethod';

                log.debug(LOG_NAME, context.request.parameters);

                var objParams = {
                    'taskid'    : context.request.parameters.custscript_cwgp_mapreducestatus,
                    'context'   : context
                };
                log.debug(LOG_NAME, 'objParams: ' + JSON.stringify(objParams));
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
    }
    
    function generateForm(objParams) {
        LOG_NAME = 'generateForm';
        var context = objParams.context;
        try {
                var form = serverWidget.createForm({
                    title : SL_OBJ.MAIN.FORM
                });


                var objTaskStatus = task.checkStatus(objParams.taskid);
                log.debug ('objTaskStatus', objTaskStatus);

                var flPending, flTotal, flProcessed;
                flPending   = objTaskStatus.getPendingMapCount();
                flTotal     = objTaskStatus.getTotalMapCount();
                flProcessed = flTotal - flPending;

                var objParams = {
                    stage : objTaskStatus.stage || 'DONE',
                    processed : flProcessed,
                    total : flTotal,
                    percentage : objTaskStatus.getPercentageCompleted(),
                    status : objTaskStatus.status
                };

                var objInlineHtml = form.addField({
                    id 		: SL_OBJ.MAIN.STATUS,
                    type 	: serverWidget.FieldType.TEXT,
                    label 	: 'Status'
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                }).defaultValue = objParams.status;

                var processField = form.addField({
                    id 		: 'custpage_cwgp_process',
                    type 	: serverWidget.FieldType.TEXT,
                    label 	: 'Process'
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                });

                var objInlineHtml = form.addField({
                    id 		: SL_OBJ.MAIN.STATUSPAGE,
                    type 	: serverWidget.FieldType.INLINEHTML,
                    label 	: 'Status Page'
                });

                objInlineHtml.defaultValue = injectStatusPage(objParams);

                form.clientScriptFileId = __CONFIG.CS_PATH;

                return context.response.writePage(form);

        } catch (e) {
            log.error(LOG_NAME,
                JSON.stringify({
                    "Error Code"    : e.code,
                    "Error Message" : e.message
                })
            );
            injectErrorPage(e, context);
        }
    }


    function injectStatusPage(objParams){

        var strTitle = 'Bulk Email to Vendors';

        var html = 	'<!DOCTYPE html>';
            html+=  '<html lang="en">';
            html+= 		'<head>';
            html+=			'<meta charset="utf-8">';
            html+=			'<meta name="viewport" content="width=device-width, initial-scale=1">';
            html+=          '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.4.0/css/bootstrap.min.css">';
            html+= 			'<style type="text/css">';
            html+=				'.uir-page-title{display: none;}';
            html+=              '.progress.active .progress-bar {-webkit-transition: none !important;transition: none !important;}';
            html+=              '.center{margin-left: auto; margin-right: auto;}'
            html+= 			'</style>';
            html+= 		'</head>';
            html+=		'<body>';
            html+=		    '<div class = "center" style = "display: table; width: 50%;">';
            html+=			    '<h1 style = "font-size: 25px; text-align: center; font-weight: bold; color: #5bc0de;">' + strTitle + '</h1></br>';
            html+=	        '</div>';
            html+=          '<div style = "display: table; width: 50%;" class = "center progress-container">';
            html+=              '<div class="progress progress-striped active">';
            html+=                  '<div class="progress-bar progress-bar-info" style = "width: ' + objParams.percentage +'%;">';
            html+=                  '</div>';
            html+=              '</div>';
            html+=          '</div>';
            html+=		    '<div class = "center" style = "display: table; width: 50%;">';
            html+=			    '<table class = "table">';
            html+=                  '<thead>';
            html+=                      '<tr class = "table-info">';
            html+=                          '<th class = "info" style = "width: 50%; font-size: 15px; text-align: center;">Percentage</th>';
            html+=                          '<th class = "info" style = "width: 50%; font-size: 15px; text-align: center;">Status</th>';
            html+=                      '</tr>';
            html+=                  '</thead>';
            html+=                  '<tbody>';
            html+=                      '<tr class = "table-info">';
            html+=                          '<td style = "width: 50%; font-size: 15px; text-align: center;">' + objParams.percentage + '%</td>';
            html+=                          '<td style = "width: 50%; font-size: 15px; text-align: center;">' + objParams.status + '</td>';
            html+=                      '</tr>';
            html+=                  '</tbody>';
            html+=              '</table>';
            html+=			    '<table class = "table" style = "margin-top: -15px;">';
            html+=                  '<thead>';
            html+=                      '<tr class = "table-info">';
            html+=                          '<th class = "info" style = "width: 50%; font-size: 15px; text-align: center;">Stage</th>';
            html+=                          '<th class = "info" style = "width: 50%; font-size: 15px; text-align: center;">Progress</th>';
            html+=                      '</tr>';
            html+=                  '</thead>';
            html+=                  '<tbody>';
            html+=                      '<tr class = "table-info">';
            html+=                          '<td style = "width: 50%; font-size: 15px; text-align: center;">' + objParams.stage + '</td>';
            html+=                          '<td style = "width: 50%; font-size: 15px; text-align: center;">' + objParams.processed + ' of ' + objParams.total + '</td>';
            html+=                      '</tr>';
            html+=                  '</tbody>';
            html+=              '</table>';
            html+=	        '</div>';
            html+= 		'</body>';
            html+= 	'</html>';

        return html;
    }

    function injectErrorPage(e, context){
        var form = serverWidget.createForm({
                title       : 'Unexpected Error'
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
            html+=				'.uir-page-title{display: none;}';
            html+= 			'</style>';
            html+= 		'</head>';
            html+=		'<body>';
            html+=		'<div id="main" style="display: table; width: 100%; height: 60vh; text-align: center;">';
            html+=			'<div class="fof" style="display: table-cell; vertical-align: middle;">';
            html+=				'<h1 style="font-size: 18px;"></br>404: Unexpected Error</h1></br>';
                            if(!(e.message)) {
            html+=				'<h1 style="font-size: 16.5px;">' + e + '</h1></br>';
                            } else {
            html+=				'<h1 style="font-size: 16.5px;">' + e.message + '</h1></br>';
                            }
            html+=			'</div>';
            html+=		'</div>';
            html+= 		'</body>';
            html+= 	'</html>';

        invInlineHTML.defaultValue = html;
        //END OF HTML
        context.response.writePage(form);

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

    return {
        onRequest: onRequest
    };
    
});
