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

	var intCurrentScriptFileId = '152997';//SB - 263135 ,Prod - 152997
	
	var SUITELET = {
		SUBMIT_BUTTON: 'Submit',
		FIELDS: {
			KEYWORDS: {
				id: 'custpage_schecker_keywords',
				label: 'Keywords to search',
				type: 'TEXT'
			}
		}
	};
	
	SUITELET.LIST = {};
	SUITELET.LIST.ID = 'custpage_schecker_sublist';
	SUITELET.LIST.COUNTER = {
		id: SUITELET.LIST.ID + '_counter',
		label: '#',
		type: 'INTEGER'
	};
	SUITELET.LIST.SCRIPT_NAME = {
		id: SUITELET.LIST.ID + '_scriptname',
		label: 'Script Name',
		type: 'TEXT'
	};
	SUITELET.LIST.SCRIPT_INTERNAL_ID = {
		id: SUITELET.LIST.ID + '_scriptinternalid',
		label: 'Script Internal ID',
		type: 'TEXT'
	};
	SUITELET.LIST.SCRIPT_ID = {
		id: SUITELET.LIST.ID + '_scriptid',
		label: 'Script ID',
		type: 'TEXT'
	};
	SUITELET.LIST.SCRIPT_FILE_NAME = {
		id: SUITELET.LIST.ID + '_scriptfilename',
		label: 'Script File Name',
		type: 'TEXT'
	};
	SUITELET.LIST.SCRIPT_FILE_ID = {
		id: SUITELET.LIST.ID + '_scriptfileid',
		label: 'Script File Internal ID',
		type: 'TEXT'
	};
	SUITELET.LIST.KEYWORDS = {
		id: SUITELET.LIST.ID + '_keywords',
		label: 'Keywords',
		type: 'TEXT'
	};
	
    function onRequest(context) {
		
		var objRequest = context.request;
		var intScriptId = objRequest.parameters.script;
		var intDeploymentId = objRequest.parameters.deploy;
		var stKeywords = objRequest.parameters[SUITELET.FIELDS.KEYWORDS.id];
		
		//create form
		var objScriptCheckerForm = serverWidget.createForm({
			title: 'Script Checker',
			//hideNavBar: true
		});
		
		if(context.request.method == 'GET') {
			
			//add submit button
			var objSubmitButton = objScriptCheckerForm.addSubmitButton({
				label: SUITELET.SUBMIT_BUTTON
			});
			
			for (var field in SUITELET.FIELDS) {
				var objFieldInfo = SUITELET.FIELDS[field];
				var objFieldParameters = {};
				objFieldParameters.id = objFieldInfo.id;
				objFieldParameters.label = objFieldInfo.label;
				objFieldParameters.type = serverWidget.FieldType[objFieldInfo.type];
				//log.debug('field',[field, objFieldParameters]);
				var objField = objScriptCheckerForm.addField(objFieldParameters);
				if (field == 'KEYWORDS' && stKeywords) objField.defaultValue = stKeywords;
			}
			
			var objScriptCheckSublist = objScriptCheckerForm.addSublist({
                id: SUITELET.LIST.ID,
                label: 'Script List',
                type: serverWidget.SublistType.LIST
            });
			
			for (var listfield in SUITELET.LIST) {
				if (listfield != 'ID') {
					var objListFieldInfo = SUITELET.LIST[listfield];
					var objListFieldParameters = {};
					objListFieldParameters.id = objListFieldInfo.id;
					objListFieldParameters.label = objListFieldInfo.label;
					objListFieldParameters.type = serverWidget.FieldType[objListFieldInfo.type];
					if (listfield == 'SCRIPT') objListFieldParameters.source = record.Type.SCRIPT;
					objScriptCheckSublist.addField(objListFieldParameters);
				}
			}
			
			if (stKeywords) {
				//create a script deployment search and get the internal ID of the script files
				var arrAvailableScripts = getScriptFilesInternalID();
				log.debug('remaining usage 1',runtime.getCurrentScript().getRemainingUsage());
				
				//load every script file and check if keyword/s are in the file contents
				var arrKeywordsToSearch = stKeywords.split(',');
				log.debug('arrKeywordsToSearch',arrKeywordsToSearch);
				var arrMatchingScriptFiles = checkKeywords(arrKeywordsToSearch,arrAvailableScripts);
				log.debug('remaining usage 2',runtime.getCurrentScript().getRemainingUsage());
				
				arrMatchingScriptFiles.forEach(function(match,index){
					for (var listfield in SUITELET.LIST) {
						if (listfield != 'ID') {
							var stSublistFieldID = SUITELET.LIST[listfield].id;
							var stSublistValue = match[stSublistFieldID];
							if (listfield == 'COUNTER') stSublistValue = parseInt(parseInt(index) + 1).toFixed(0);
							if (listfield == 'KEYWORDS') stSublistValue = stSublistValue.toString();
							//log.debug('list field',[listfield, stSublistFieldID, stSublistValue]);
							objScriptCheckSublist.setSublistValue({
								id: stSublistFieldID,
								line: index,
								value: stSublistValue
							});
						}
					}
				});
				
				log.debug('remaining usage 3',runtime.getCurrentScript().getRemainingUsage());
			}
			
			context.response.writePage(objScriptCheckerForm);
			
		} else {			
			var objParameters = {};
			objParameters[SUITELET.FIELDS.KEYWORDS.id] = stKeywords;
			
			context.response.sendRedirect({
				type: https.RedirectType.SUITELET,
				identifier: intScriptId,
				id: intDeploymentId,
				parameters: objParameters
			});
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
		
		var objScriptNameColumn = search.createColumn({
			name: 'name',
			join: 'script'
		});
		
		var objScriptIDColumn = search.createColumn('scriptid');
		
		var objScriptInternalIDColumn = search.createColumn({
			name: 'internalid',
			join: 'script'
		});
		
		var objScriptDeploymentSearch = search.create({
			type: search.Type.SCRIPT_DEPLOYMENT,
			filters: [objIsDeployedFilter],
			columns : [objScriptFileColumn,objScriptNameColumn,objScriptIDColumn,objScriptInternalIDColumn]
		});
		
		var arrDeployedScriptFiles = [];
		var arrDeployedScripts = [];
		
		objScriptDeploymentSearch.run().each(function(result){
			var intScriptFileInternalID = result.getValue(objScriptFileColumn);
			var stScriptName = result.getValue(objScriptNameColumn);
			var stScriptID = result.getValue(objScriptIDColumn);
			var intScriptInternalID = result.getValue(objScriptInternalIDColumn);
			var objDeployedScriptFile = {};
			objDeployedScriptFile.scriptfileid = intScriptFileInternalID;
			objDeployedScriptFile.scriptname = stScriptName;
			objDeployedScriptFile.scriptid = stScriptID;
			objDeployedScriptFile.scriptinternalid = intScriptInternalID;
			
			var intDeployedScriptIndex = arrDeployedScriptFiles.indexOf(intScriptFileInternalID);
			
			if (intDeployedScriptIndex == -1) {
				arrDeployedScriptFiles.push(intScriptFileInternalID);
				arrDeployedScripts.push(objDeployedScriptFile);
			}		
			
			return true;
		});
		
		//exclude this script
		var intCurrentScriptIndex = arrDeployedScriptFiles.indexOf(intCurrentScriptFileId);
		arrDeployedScriptFiles.splice(intCurrentScriptIndex,1);
		
		var objDeployedScripts = {};
		objDeployedScripts.arrDeployedScriptFiles = arrDeployedScriptFiles;
		objDeployedScripts.arrDeployedScripts = arrDeployedScripts;
		
		log.debug('arrDeployedScriptFiles.length',arrDeployedScriptFiles.length);
		log.debug('arrDeployedScriptFiles',arrDeployedScriptFiles);
		
		var arrAvailableScripts = getAvailableScripts(objDeployedScripts);
		
		log.debug(stFunctionName,'END');
		return arrAvailableScripts;
	}//getScriptFilesInternalID end
	
	function getAvailableScripts(objDeployedScripts) {
		var stFunctionName = 'getAvailableScripts';
		log.debug(stFunctionName,'START');
		
		var objInternalIDFilter = search.createFilter({
			name: 'internalid',
			operator: search.Operator.ANYOF,
			values: objDeployedScripts.arrDeployedScriptFiles
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
		var arrAvailableScripts = [];
		//var objScriptFile = {};
		objFileSearch.run().each(function(result){
			/*var intScriptFileInternalID = result.id;
			var blIsAvailable = result.getValue(objIsAvailableColumn);
			objScriptFile = {};
			objScriptFile.internalid = intScriptFileInternalID;
			objScriptFile.isavailable = blIsAvailable;*/
			objDeployedScripts.arrDeployedScripts.forEach(function(data){
				if (data.scriptfileid == result.id) arrAvailableScripts.push(data);
			});
			return true;
		});
		
		//log.debug('arrScriptFiles',JSON.stringify(arrScriptFiles));
		log.debug('arrAvailableScripts.length',arrAvailableScripts.length);
		log.debug('arrAvailableScripts',arrAvailableScripts);
		
		log.debug(stFunctionName,'END');
		
		return arrAvailableScripts;
		
	}//getAvailableScripts end
	
	function checkKeywords(arrKeywordsToSearch,arrAvailableScripts) {
		var stFunctionName = 'checkKeywords';
		log.debug(stFunctionName,'START');
		
		var arrMatchingScriptFiles = [];
		var objMatchingScriptFile = {};
		
		var stScheme = 'https://';
		var stHost = url.resolveDomain({
			hostType: url.HostType.APPLICATION
		});
		var stScriptURL = '/app/common/scripting/script.nl?id=';
		
		arrAvailableScripts.forEach(function(script,index){
			var objScriptFile = file.load({
				id: script.scriptfileid
			});
			//log.debug('remaining usage ' + index ,runtime.getCurrentScript().getRemainingUsage());
			var stFileContents = objScriptFile.getContents();
			var stFileName = objScriptFile.name;
			
			arrKeywordsToSearch.forEach(function(keyword){
				if (stFileContents.match(keyword)) {
					
					var intMatchingScriptIndex = -1;
					arrMatchingScriptFiles.forEach(function(matchscript,matchindex){
						if (matchscript[SUITELET.LIST.SCRIPT_FILE_ID.id] == script.scriptfileid) intMatchingScriptIndex = matchindex;
					});
					
					if (intMatchingScriptIndex == -1) {
						objMatchingScriptFile = {};
						objMatchingScriptFile[SUITELET.LIST.KEYWORDS.id] = [];
						objMatchingScriptFile[SUITELET.LIST.KEYWORDS.id].push(keyword);
						//objMatchingScriptFile[SUITELET.LIST.SCRIPT.id] = script.scriptinternalid;
						//objMatchingScriptFile[SUITELET.LIST.SCRIPT_NAME.id] = script.scriptname;
						objMatchingScriptFile[SUITELET.LIST.SCRIPT_INTERNAL_ID.id] = script.scriptinternalid;
						objMatchingScriptFile[SUITELET.LIST.SCRIPT_ID.id] = script.scriptid;
						objMatchingScriptFile[SUITELET.LIST.SCRIPT_FILE_NAME.id] = stFileName;
						objMatchingScriptFile[SUITELET.LIST.SCRIPT_FILE_ID.id] = script.scriptfileid;
						
						var stFullScriptURL = stScheme + stHost + stScriptURL + script.scriptinternalid;
						
						objMatchingScriptFile[SUITELET.LIST.SCRIPT_NAME.id] = '<a href=' + stFullScriptURL + '>' + script.scriptname + '</a>';
						arrMatchingScriptFiles.push(objMatchingScriptFile);
					} else {
						arrMatchingScriptFiles[intMatchingScriptIndex][SUITELET.LIST.KEYWORDS.id].push(keyword);
					}
					
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
		
		return arrUniqueMatchingScriptFiles;
		
	}//checkKeywords end
	
    return {
        onRequest: onRequest
    };
    
});