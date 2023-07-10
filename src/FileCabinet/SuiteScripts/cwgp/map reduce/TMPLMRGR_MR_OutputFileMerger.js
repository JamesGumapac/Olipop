 /**
 * TMPLMRGR_MR_OutputFileMerger.js
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NAmdConfig ../namdconfig/TMPLMRGR_CONF_namdconfig.json
 *
 * Author : maquino
 * Date : Sept 02, 2021
 *
 * Modifications :
 * 
 */

var dependencies = ['TMPLMRGRGlobalLib','N/runtime','N/search','N/file','N/format','N/record','N/cache'];

define(dependencies,function(TMPLMRGRLIB,runtime,search,file,format,record,cache){

    function getConfig(){
        let SAVEDSEARCH = runtime.getCurrentScript().getParameter({name : 'custscript_cwgp_mrgrss'}) || false;
        let TEMPLATEHEADER = runtime.getCurrentScript().getParameter({name : 'custscript_cwgp_mrgrtmpl'}) || false;
        return {SAVEDSEARCH,TEMPLATEHEADER};
    }

    function getInputData(){ 

        log.debug('GetInputData START');
        let {SAVEDSEARCH,TEMPLATEHEADER} = getConfig();

        //validate if savedsearch and folder is not empty
        if(SAVEDSEARCH == false){
            log.error('EMPTY SAVED SEARCH - PLEASE CHECK DEPLOYMENT')
            return false;
        }
        if(TEMPLATEHEADER == false){
            log.error('TEMPLATE HEADER NOT CONFIGURED - PLEASE CHECK DEPLOYMENT')
            return false;
        }        

        //load search
        return search.load({
            id : SAVEDSEARCH,
        });

    }

    function map(context)
    {

        log.debug('MAP START');
        log.debug('MAP CONTEXT',context);

        let {TEMPLATEHEADER} = getConfig();

        try{
            let objRecordInfo = JSON.parse(context.value);
            let objArgs = {type : objRecordInfo.recordType, id : objRecordInfo.id , templateId : TEMPLATEHEADER};

            TMPLMRGRLIB.produceIntegrationMessage({...objArgs});
        
        }catch(e){
            log.error('ERROR ON MAP ',e.message);
        }
        

    }


    function summarize(summary)
    {

        log.debug('END MAPREDUCE');

    }

    return {
        getInputData: getInputData,
        map: map,
        summarize: summarize,
    };
})