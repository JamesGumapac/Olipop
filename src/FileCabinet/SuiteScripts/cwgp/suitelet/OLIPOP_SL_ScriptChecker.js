/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

/**
 * Author: Erick Dela Rosa
 * Reference: 
 * Date: 18 Apr 2023
 * 
 *  Date Modified       Modified By                 Notes
 *  18 Apr 2023         Erick Dela Rosa             Initial Development
 * 
 */

define(['N/error','N/redirect', 'N/file', 'N/https', 'N/record', 'N/render', 'N/search', 'N/ui/serverWidget', 'N/url', 'N/xml', 'N/runtime', 'N/format'],

function(error,redirect, file, https, record, render, search, serverWidget, url, xml, runtime, format) {

	var intCurrentScriptFileId = '67415';//SB
	var arrKeywordsToSearch = ['custbody_olipop_sentout_flag'];
	//var arrKeywordsToSearch = arrNetSuiteConnectorKeywords.concat(arrNetSuiteConnectorMarketplaceCartKeywords);

    function onRequest(context) {
		
		//create form
		var objScriptCheckerForm = serverWidget.createForm({
			title: 'Script Checker',
			//hideNavBar: true
		});
		
		if(context.request.method == 'GET'){
			var objRequest = context.request;
			var intScriptId = objRequest.parameters.script;
            var intDeploymentId = objRequest.parameters.deploy;

			//create a script deployment search and get the internal ID of the script files
			var arrScriptFilesInternalID = getScriptFilesInternalID();
			
			
			//exclude this script
			var intCurrentScriptIndex = arrScriptFilesInternalID.indexOf(intCurrentScriptFileId);
			arrScriptFilesInternalID.splice(intCurrentScriptIndex,1);
			
			//load every script file and check if keyword/s are in the file contents
			log.debug('arrKeywordsToSearch',arrKeywordsToSearch);
			checkKeywords(arrKeywordsToSearch,arrScriptFilesInternalID);
	
			context.response.writePage(objScriptCheckerForm);
			
		} else {
			
		}//if(context.request.method == 'GET') end
    }//onRequest end
	
	function getScriptFilesInternalID () {
		var stFunctionName = 'getScriptFilesInternalID';
		log.debug(stFunctionName,'START');
		
		var objIsDeployedFilter = search.createFilter({
			name: 'isdeployed',
			operator: search.Operator.IS,
			values: ['T']
		});
		
		var objScriptFileColumn = search.createColumn({
			name: 'scriptfile',
			join: 'script'
		});
		
		var objScriptDeploymentSearch = search.create({
			type: search.Type.SCRIPT_DEPLOYMENT,
			filters: [objIsDeployedFilter],
			columns : [objScriptFileColumn]
		});
		
		var arrDeployedScriptFiles = [];
		
		objScriptDeploymentSearch.run().each(function(result){
			var intScriptFileInternalID = result.getValue(objScriptFileColumn);
			arrDeployedScriptFiles.push(intScriptFileInternalID);
			return true;
		});
		
		log.debug('arrDeployedScriptFiles.length',arrDeployedScriptFiles.length);
		log.debug('arrDeployedScriptFiles',arrDeployedScriptFiles);
		
		var arrScriptFilesInternalID = getAvailableScripts(arrDeployedScriptFiles);
		
		log.debug(stFunctionName,'END');
		return arrScriptFilesInternalID;
	}//getScriptFilesInternalID end
	
	function getAvailableScripts(arrDeployedScriptFiles) {
		var stFunctionName = 'getAvailableScripts';
		log.debug(stFunctionName,'START');
		
		var objInternalIDFilter = search.createFilter({
			name: 'internalid',
			operator: search.Operator.ANYOF,
			values: arrDeployedScriptFiles
		});
		var objIsAvailableFilter = search.createFilter({
			name: 'isavailable',
			operator: search.Operator.IS,
			values: ['T']
		});
		
		//var objIsAvailableColumn = search.createColumn('isavailable');
		var objFileSearch = search.create({
			type: 'file',
			filters: [objInternalIDFilter,objIsAvailableFilter],
			//columns : [objIsAvailableColumn]
		});
		var arrScriptFilesInternalID = [];
		//var objScriptFile = {};
		objFileSearch.run().each(function(result){
			/*var intScriptFileInternalID = result.id;
			var blIsAvailable = result.getValue(objIsAvailableColumn);
			objScriptFile = {};
			objScriptFile.internalid = intScriptFileInternalID;
			objScriptFile.isavailable = blIsAvailable;*/
			arrScriptFilesInternalID.push(result.id);
			return true;
		});
		
		//log.debug('arrScriptFiles',JSON.stringify(arrScriptFiles));
		log.debug('arrScriptFilesInternalID.length',arrScriptFilesInternalID.length);
		log.debug('arrScriptFilesInternalID',arrScriptFilesInternalID);
		
		log.debug(stFunctionName,'END');
		
		return arrScriptFilesInternalID;
		
	}//getAvailableScripts end
	
	function checkKeywords(arrKeywordsToSearch,arrScriptFilesInternalID) {
		var stFunctionName = 'checkKeywords';
		log.debug(stFunctionName,'START');
		
		var arrMatchingScriptFiles = [];
		var objMatchingScriptFile = {};
		
		arrScriptFilesInternalID.forEach(function(scriptfileid){
			var objScriptFile = file.load({
				id: scriptfileid
			});
			var stFileContents = objScriptFile.getContents();
			var stFileName = objScriptFile.name;
			
			arrKeywordsToSearch.forEach(function(keyword){
				if (stFileContents.match(keyword)) {
					objMatchingScriptFile = {};
					objMatchingScriptFile.keyword = keyword;
					objMatchingScriptFile.scriptfileid = scriptfileid;
					objMatchingScriptFile.name = stFileName;
					arrMatchingScriptFiles.push(objMatchingScriptFile);
				}
			});
		});
		
		function onlyUnique(value, index, self) {
			return self.indexOf(value) === index;
		}

		var arrUniqueMatchingScriptFiles = arrMatchingScriptFiles.filter(onlyUnique);
		
		log.debug('arrUniqueMatchingScriptFiles.length',arrUniqueMatchingScriptFiles.length);
		log.debug('arrUniqueMatchingScriptFiles',JSON.stringify(arrUniqueMatchingScriptFiles));
		
		log.debug(stFunctionName,'END');
		
	}//checkKeywords end
	
    return {
        onRequest: onRequest
    };
    
});