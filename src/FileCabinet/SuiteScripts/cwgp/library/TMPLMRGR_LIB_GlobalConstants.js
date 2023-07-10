/**
* TMPLMRGR_LIB_GlobalConstants.js
* @NApiVersion 2.1
* @NModuleScope Public
* @NAmdConfig ../namdconfig/TMPLMRGR_CONF_namdconfig.json
*
* Author : maquino
* Date : Aug 31, 2021
*
* Modifications
*
*/

var dependencies = ['N/runtime','N/format','N/search','N/record'];

define(dependencies,function(runtime,format,search,record){

	const TIMEZONE = format.Timezone.AMERICA_CHICAGO;
	const DATEFORMAT = "YYYY-MM-DD";

	return {

		INITIALIZE : function(){

			let _self = {}

			//TIMEPRESENTED IN LOGS
			_self.TIMEZONE = TIMEZONE
			//NUMBER OF LOGS TO KEEP
			_self.LOGLINESLIMIT = 20;

			//DATA MAPPING FOR HARDCODED VALUES / IDS
			_self.MAPPING = {
				//TRANSACTION TYPE CUSTOM FIELD TO record.Type
				TYPE : {
					itemreceipt 	: 16,
					workorder 		: 44,
					salesorder 		: 31,
				},
				//1 INBOUND , 2 OUTBOUND
				CONNECTIONTYPE : {
					INBOUND 	: 1,
					OUTBOUND 	: 2,
				},
				//currently supported file types
				FILETYPES : [
					{ID : 1, EXT : "csv", TYPE : "CSV"}, 
					{ID : 2, EXT : "txt", TYPE : "PLAINTEXT"}, 
					{ID : 3, EXT : "xml", TYPE : "XMLDOC"}, 
					{ID : 4, EXT : "xls", TYPE : "EXCEL"}, 
				],


			}

			//CUSTOMRECORD DEFINITION
			_self.CUSTOMRECORDS = {};

			//TEMPLATE HEADER
			_self.CUSTOMRECORDS.TMPLHEADER = {
				ID : 'customrecord_cwgp_tmplheader',
				FIELDS : {
					NAME			: 'name',
					FILENAME 		: 'custrecord_cwgp_tmplheader_filename',
					TYPE			: 'custrecord_cwgp_tmplheader_type',
					FOLDER			: 'custrecord_cwgp_tmplheader_folder',
					AFTEREXPORT		: 'custrecord_cwgp_tmplheader_afterexport',
					FILETYPE		: 'custrecord_cwgp_tmplheader_ftype',
				},
				SUBLISTS : {

				}
			}

			//TEMPLATE LINES
			_self.CUSTOMRECORDS.TMPLLINES = {
				ID : 'customrecord_cwgp_tmplline',
				FIELDS : {
					PARENT		 	: 'custrecord_cwgp_tmplline_parent',
					SAVEDSEARCH 	: 'custrecord_cwgp_tmplline_savedsearch',
					TEMPLATE 		: 'custrecord_cwgp_tmplline_template',
					FIELDID 		: 'custrecord_cwgp_tmplline_fieldid',
					JOINFIELDID		: 'custrecord_cwgp_tmplline_joinfieldid',
					ORDER 			: 'custrecord_cwgp_tmplline_order',
					TMPLPARENT		: 'custrecord_cwgp_tmplline_tmplparent',
					EXITONEMPTY 	: 'custrecord_cwgp_tmplline_returnnull',
					SINGLERESULT 	: 'custrecord_cwgp_tmplline_forcesingle',
					JOINFIELDUPLVL  : 'custrecord_cwgp_tmplline_joinupfieldid',
					CUSTOMDATA		: 'custrecord_cwgp_tmplline_customdata',
					SPECIALFUNCTION	: 'custrecord_cwgp_tmplline_special',
				}
			}

			_self.CUSTOMRECORDS.TMPLSEQUENCER = {
				ID : 'customrecord_cwgp_tmplsequencer',
				FIELDS : {
					ID 				: 'name', 
				}
			}
			
			_self.HELPERS = {}
			//get mainbody fields on both HTTP GET / POST Methods
			_self.HELPERS.getPostedValues = function(paramObj){
				log.debug('START getPostedValues')

				var posted = paramObj.parameters;
				var fields = paramObj.fields;

				log.debug('parameters',JSON.stringify(posted));

				Object.keys(fields).forEach(function(fieldId){

					// if(posted.hasOwnProperty(fieldId))
					// 	fields[fieldId] = posted[fieldId] || fields[fieldId];
					if(['mapping','__config'].indexOf(fieldId) == -1){
						try{
							if(posted.hasOwnProperty(fieldId)){
								// var value = JSON.parse(posted[fieldId]) || fields[fieldId];
								var value = posted[fieldId] || fields[fieldId];
								// log.debug('DATAPOSTED PRECLEANSE '+fieldId,value)

								if(fields.hasOwnProperty('__config') && fields.__config.hasOwnProperty(fieldId) ){
									var type = fields.__config[fieldId];
									if(type == 'DATE')
										value = format.format({value : value,type : format.Type.DATE,})
									else if(type == 'BOOLEAN')
										value = (typeof(value) == 'boolean')? ((value)?'T':'F') : value;

								}else{
									// value = JSON.parse(value);
									value = value;
								}
								// log.debug('DATAPOSTED POSTCLEANSE '+fieldId,value)
								fields[fieldId] = value;
							}
						}catch(e){

							// log.debug('SUBLISTDATA',fieldId)
							if(posted[fieldId].split("\u0002")[0] == "")
								fields[fieldId] = "";
							else{
								fields[fieldId] = posted[fieldId].split("\u0002").map(function(y){
									return y.split("\u0001");
								});
							}
							// .map(y => y.split("\u0001"));
						}
					}

					// log.debug('POSTED VALUE : '+fieldId,fields[fieldId])

				})

				log.debug('END getPostedValues',JSON.stringify(fields))
				return fields;

			};


			//returns @Array of JSON Object where key = sublist field / column, value = sublist field value
			_self.HELPERS.getPostedSublistValues = function(paramObj){
				log.debug('START getPostedSublistValues')

				var request = paramObj.request;
				var sublistId = paramObj.sublistId;
				var fields = paramObj.fields;

				var options = (paramObj.hasOwnProperty('options') )?paramObj.options:new Array();

				var lines = new Array();

				var lineCount = request.getLineCount({group : sublistId});
				for(var x = 0; x< lineCount; x++){

					var line = {}

					fields.forEach(function(fieldId){

						line[fieldId] = request.getSublistValue({group : sublistId, name : fieldId, line : x})

					})
					lines.push(line);

				}

				log.debug('END getPostedSublistValues',JSON.stringify(lines))
				return lines;

			};

			_self.HELPERS.convertToDateObject = function(paramObj){
				log.debug('START convertToDateObject');
				var date = paramObj.date;

				var returnDate= format.parse({value:date,type : format.Type.DATE});
				log.debug('END convertToDateObject',returnDate);
				return returnDate
			};

			_self.HELPERS.mainFieldSetter = function(paramObj){


				let {recordObj,values} = paramObj;

				log.debug('mainFieldSetter',values)

				Object.keys(values).forEach((fieldId)=>{
					// log.debug('SET FIELD:'+fieldId, values[fieldId]);
					recordObj.setValue({fieldId : fieldId, value : values[fieldId]});
				})

				return recordObj;

			}


			_self.HELPERS.createNewLogLine = function(paramObj){

				let {newLog,logs} = paramObj;
				try{

					logs = (logs || false);

					//if newLog is not empty
					if(newLog || false != false){

						//if logs is not empty then split into array ; else new array;
						logs = (logs!=false)?logs.split('\n') : new Array();

						// remove 20th log
						logs = logs.splice(0,19);

			            let datestring = format.format({
			                value : new Date(),
			                type : format.Type.DATETIMETZ,
			                timezone : TIMEZONE,
			            })
						//prepare logs format here

						newLog = datestring + "\t\t- "+newLog;

						//then prepend new line then convert to string with newline \n as delimiter
						logs.unshift(newLog)

						logs = logs.join('\n');

					}

				}catch(e){

				}

				// log.debug('Logs',logs);
				return logs || "";
			}

			_self.HELPERS.cleanupTemplate = function(paramObj){
				log.debug('START cleanupTemplate',paramObj)
				let {template,toArray} = paramObj
				try{

					let patterns = new Array();

					patterns.push({
						pattern : /\\r|\\n|\\t/g,
						replace : "",
					})
					patterns.push({
						pattern : /\s+/g,
						replace : " ",
					})					

					/*
					
					patterns.push({
						pattern : /\\?"/g,
						replace : "",
					})
					
					patterns.push({
						pattern : /{\S+}/g,
						replace : "''",
					})
					*/
					

					patterns.map((pattern)=>{
						template = template.replace(pattern.pattern, pattern.replace);
					})

					if((toArray ||false) != false){

						template = "["+template.trim()+"]";
						log.debug('TEMPLATE TO PARSE',template);
						template = JSON.parse(template);

					}				

				}catch(e){
					log.error('UNEXPECTED ERROR cleanupTemplate',e.message);
					template = false;
				}
				log.debug('END cleanupTemplate isArray:'+util.isArray(template),template);
				return template;

			}			

			
			return _self;
		},
	}

})