/**
* TMPLMRGR_LIB_GlobalLibrary.js
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

var dependencies = ['TMPLMRGRGlobalCons','TMPLMRGRCustomData','N/record','N/search','N/runtime','N/format','N/error','N/encode','N/file','N/xml'];

define(dependencies,function(TMPLMRGRCONS,TMPLMRGRCustom,record,search,runtime,format,error,encode,file,xml){

	const TMPLCons = TMPLMRGRCONS.INITIALIZE();
	const HELPERS = TMPLCons.HELPERS;

	const TIMEZONE = TMPLCons.TIMEZONE;

	const MAPPING = TMPLCons.MAPPING;

	//MODULES
	// const TRANSACTIONS = SMRTCons.TRANSACTIONS;

	//CUSTOMRECORDS
	const CUSTOMRECORDS = TMPLCons.CUSTOMRECORDS;
	const TMPLHEADER = CUSTOMRECORDS.TMPLHEADER;
	const TMPLLINES = CUSTOMRECORDS.TMPLLINES;
	const TMPLSEQUENCER = CUSTOMRECORDS.TMPLSEQUENCER;

	//custom data
	const TMPLCustom = TMPLMRGRCustom.__construct();

	/**
	* Create file output and dump into configured folder
	* @param {Object} paramObj - 
	* @param {string} paramObj.type 		- record type [required]
	* @param {integer} paramObj.id 			- record internalid [required]
	* @param {integer} paramObj.templateId 	- Template Header internalid [required]
	* @return {boolean} boolReturn 			- flag success / fail
	*/

	function produceIntegrationMessage(paramObj){

		let strFunc = "produceIntegrationMessage";

		let {type,id,templateId} = paramObj;
		let objRecordInfo = {type : type,id : id};
		let intTemplateId = templateId;
		let intId = id;		

		let boolReturn = false;

		try{

			log.debug(`START ${strFunc}`,paramObj)

			if(intId == null)
				throw error.create({message : `Error Occurred - ${strFunc} Args {id} is EMPTY.`, name : 'ARGS_EMPTY',notifyOff : true,});
			if(intTemplateId == null)
				throw error.create({message : `Error Occurred - ${strFunc} Args {intTemplateId} is EMPTY.`, name : 'ARGS_EMPTY',notifyOff : true,});

			//get template component first
			let objTemplate = fetchTemplateComponents({id : intTemplateId});

			if(objTemplate == false)
				throw error.create({message : `Error Occurred - ${strFunc} Template Header not found.`, name : 'TMPL_EMPTY',notifyOff : true,})

			let strFileContent = "";

			//loop thru each line to build strFileContent

			objTemplate.LINES.forEach((objLine,intIndex)=>{

				log.debug(`Template obj counter:${intIndex}`,objLine);
				try{

					let intSearchId 	= objLine.SAVEDSEARCH;
					let strTemplate 	= objLine.TEMPLATE;

					let strFieldId 		= objLine.FIELDID;
					let strJoinFieldId	= objLine.JOINFIELDID;
					let strJoinFieldUp  = objLine.JOINFIELDUPLVL || false;

					let boolExitOnEmpty	= objLine.EXITONEMPTY;
					let boolSingleOnly  = objLine.SINGLERESULT;
					let intResultCount  = 0;

					let arrMergedLines 	= new Array();

					let intLoopId = intId;

					
					let strCustomSource	= objLine.CUSTOMDATA || false;

					let strSpecialFunc= objLine.SPECIALFUNCTION || false;

					// build saved search
					let objSearch = search.load({id : intSearchId})

					//get filters in saved search then push specific id filter
					let arrFilters = [...objSearch.filterExpression];
					if(arrFilters.length > 0)
						arrFilters.push('AND');

					//
					log.debug('strJoinFieldUp',strJoinFieldUp);
					if(strJoinFieldUp != false){
						//
						let objLookupField = search.lookupFields({...objRecordInfo, columns : [strJoinFieldUp]});
						
						if(objLookupField[strJoinFieldUp] != ""){
							if(util.isArray(objLookupField[strJoinFieldUp]) && objLookupField[strJoinFieldUp].length > 0){
								intLoopId = objLookupField[strJoinFieldUp][0].value
							}
							else{
								intLoopId = objLookupField[strJoinFieldUp];
							}
						}
					}					

					let strCriteria = 'internalid';
					//field to be used as criteria				
					if(strJoinFieldId != false)
						strCriteria = strJoinFieldId;

					//if custom dataset is configured
					if(strCustomSource != false){
						log.debug('TMPLCustom',TMPLMRGRCustom.__construct());

						let arrCustomData = TMPLCustom[strCustomSource]({objSearch : objSearch,strCriteria : strCriteria,intId : intLoopId});

						if(util.isString(arrCustomData) == true){
							arrMergedLines.push(arrCustomData);
						}else{						
							arrCustomData.forEach((objMergedLine)=>{
								let strLineTemplate = strTemplate;

								Object.keys(objMergedLine).forEach((objPattern)=>{
									let strValue = objMergedLine[objPattern];
									strLineTemplate = strLineTemplate.replace(objPattern,strValue);								
								})

								arrMergedLines.push(strLineTemplate);

							})	
						}
											
					}else if(strSpecialFunc != false){

						//specific functions
						if(strSpecialFunc == "OrderLineNotes"){

							strFileContent = TMPLCustom[strSpecialFunc]({objSearch : objSearch,strCriteria : strCriteria,intId : intLoopId, strFileContent : strFileContent});
							
						}

					}else{

						arrFilters.push([strCriteria,search.Operator.ANYOF,intLoopId]);

						log.debug('arrFilters',JSON.stringify(arrFilters));

						//set filters
						objSearch.filters = null;
						objSearch.filterExpression = arrFilters;

						let arrColumns = [...objSearch.columns];

						//perform search
						let objPagedData = objSearch.runPaged({pageSize : 1000});
						intResultCount = objPagedData.count;

						//push template if configured to return template even if search result is empty
						if(boolExitOnEmpty == false && intResultCount <= 0){
							arrMergedLines.push(strTemplate);
						}

						for( var i=0; i < objPagedData.pageRanges.length; i++ ) {
							let objCurrentPage = objPagedData.fetch({index:i});
							objCurrentPage.data.forEach((objRow,intRowIndex)=>{

								//exit on first result if Single Result only
								if(boolSingleOnly == true && intRowIndex > 0)
									return false;

								let strLineTemplate = strTemplate;

								arrColumns.forEach((objColumn)=>{

									//get value
									let strValue = (objRow.getText(objColumn) || objRow.getValue(objColumn) || "");

									let objParsedColumn = {...objColumn}
									
									//cleanup values
									if(objParsedColumn.type == 'checkbox'){
										//do not enclose boolean in quotes
										strValue = (strValue || false);
									}else{						
										strValue = strValue.replace(/[^A-Za-z0-9_ ]/g, '\$&');
										strValue = strValue.trim();

										if(objParsedColumn.type == 'date' && strValue != ""){

											let objDate = format.parse({value : strValue ,type : format.Type.DATE,});
											let strYear = objDate.getFullYear();

											let strMonth = parseInt(objDate.getMonth())+1;;
											if(strMonth < 10) strMonth = `0${strMonth}`;

											let strDay = parseInt(objDate.getDate());
											if(strDay< 10) strDay = `0${strDay}`;

											strValue = `${strYear}-${strMonth}-${strDay}`;							
										}
										strValue = `${strValue}`;
									}

									//get label
									let strLabel = objColumn.label || false;

									/*
									*then create regexp - (?:\'|"|) - needle enclosed in :
									*single quotes, double quotes, or not enclosed
									*/

									// let objPattern = strLabel;
									strLabel = strLabel.replace(/[$]/g, '\\$&')
									// strLabel = strLabel.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
									let objPattern = new RegExp('('+strLabel+')','g');
									//replace all instances of pattern with value

									//escape XML
									strValue = xml.escape({xmlText : strValue});

									strLineTemplate = strLineTemplate.replace(objPattern,strValue);

								})	

								arrMergedLines.push(strLineTemplate);

							})

							if(boolSingleOnly == true)
								break
							
						}
						//END FOR LOOP
					}

					//if strFieldId is EMPTY = then it's the MASTER TEMPLATE
					if(strFieldId == false){
						strFileContent = arrMergedLines.join("");
					}
					else{

						// let objPattern = strFieldId;
						strFieldId = strFieldId.replace(/[$]/g, '\\$&')
						let objPattern = new RegExp('('+strFieldId+')','g');
						//replace all instances of pattern with merged lines
						strFileContent = strFileContent.replace(objPattern,arrMergedLines.join(""));					
					}

		            boolReturn = true;
	        	}catch(e){
	        		log.error('Error on Merge Lines ',e.message)
	        	}

			})

			let objPattern = new RegExp('\\${\\S+}','g');
			strFileContent = strFileContent.replace(objPattern,'')

			//create new sequence
			let intSequenceId = record.create({type : TMPLSEQUENCER.ID}).save();
			let objSequence = search.lookupFields({type : TMPLSEQUENCER.ID, id : intSequenceId, columns : [TMPLSEQUENCER.FIELDS.ID]});

			//then create file
	        let strTimestamp= format.format({
	            value : new Date(),
	            type : format.Type.DATETIMETZ,
	            timezone : TIMEZONE,
	        })				


	        let objFileType = TMPLCons.MAPPING.FILETYPES.find(k => k.ID == objTemplate.FILETYPE) || false;

	        if(objFileType == false)
	        	throw error.create({message : `Error Occurred - ${strFunc} UNSUPPORTED FILETYPE / FILETYPE EMPTY.`, name : 'FILETYPE_UNKNOWN',notifyOff : true,});

			//CREATE OUTPUT FILE 
            let objXMLOutput = file.create({
                name : `${objTemplate.FILENAME || objTemplate.NAME}${objSequence[TMPLSEQUENCER.FIELDS.ID]}.${objFileType.EXT}`,
                fileType : file.Type[objFileType.TYPE],
                contents : strFileContent,
            })

            objXMLOutput.folder = objTemplate.FOLDER;
            let intFileId = objXMLOutput.save(); 
            log.debug('CREATED FILE ID:',intFileId);		

            //then delete sequencer
            record.delete({type : TMPLSEQUENCER.ID, id : intSequenceId});

            //update record
            if(objTemplate.AFTEREXPORT != false){

            	try{
            		log.debug(`ATTEMPT SUBMITFIELDS ${JSON.stringify(objRecordInfo)}`,objTemplate.AFTEREXPORT);

            		let objSubmitFields = JSON.parse(objTemplate.AFTEREXPORT);

            		log.debug('objSubmitFields isobject',util.isObject(objSubmitFields));
            		log.debug('objSubmitFields isString',util.isString(objSubmitFields));
            		log.debug('objSubmitFields',objSubmitFields);

        			log.audit('ATTEMPT RECORDLOAD');

        			let objRecordToUpdate = record.load({...objRecordInfo});

        			Object.keys(objSubmitFields).forEach((fieldId)=>{
        				objRecordToUpdate.setValue({fieldId : fieldId, value : objSubmitFields[fieldId]});
        			})

        			//temp for workorder buildable and sent
        			if(objRecordToUpdate.type == 'workorder'){
        				let objLookups = search.lookupFields({...objRecordInfo, columns : ['buildable','custbody_tfg_senttoby']});
        				let intBuildable = parseInt(objLookups.buildable || 0);

        				log.audit('Update SENT for WORKORDER',intBuildable);
        				objRecordToUpdate.setValue({fieldId : 'custbody_tfg_senttoby', value : intBuildable});

        			}

        			objRecordToUpdate.save({ignoreMandatoryFields : true});

        			log.debug('SUCCESS RECORDLOAD-SAVE')            		

            		/*
            		try{
            			record.submitFields({...objRecordInfo, values : objSubmitFields})
            			log.debug('SUCCESS SUBMITFIELDS')
            		}catch(e){
            			log.audit('SUBMITFIELDS FAILED, ATTEMPT RECORDLOAD');

            			let objRecordToUpdate = record.load({...objRecordInfo});

            			Object.keys(objSubmitFields).forEach((fieldId)=>{
            				objRecordToUpdate.setValue({fieldId : fieldId, value : objSubmitFields[fieldId]});
            			})

            			//temp for workorder buildable and sent
            			if(objRecordToUpdate.type == 'workorder'){
            				let objLookups = search.lookupFields({...objRecordInfo, columns : ['buildable','custbody_tfg_senttoby']});
            				let intBuildable = parseInt(objLookups.buildable || 0);
            				objRecordToUpdate.setValue({fieldId : 'custbody_tfg_senttoby', value : 'intBuildable'});

            			}

            			objRecordToUpdate.save({ignoreMandatoryFields : true});

            			log.debug('SUCCESS RECORDLOAD-SAVE')
            		}*/

            	}catch(e){
            		log.error(`UNEXPECTED ERROR`,e.message);
            	}


            }


		}catch(e){
			log.error(`UNEXPECTED ERROR ${strFunc}`,e.message);
		}

		log.debug(`END ${strFunc}`,boolReturn)
		return boolReturn;

	}

	/**
	* Fetch template header and child components
	* @param {Object} paramObj - 
	* @param {integer} paramObj.id - Template Header internalid [required]
	* @return {Object / boolean false} objReturn - (Object) / (Boolean) false on failure
	*/
	function fetchTemplateComponents(paramObj){

		let strFunc = "fetchTemplateComponents";

		let {id} = paramObj;
		let objRecordInfo = {type : TMPLHEADER.ID,id : id};
		let objReturn = false;
		let intId = id;

		try{

			log.debug(`START ${strFunc}`,paramObj)

			if(intId == null)
				throw error.create({message : `Error Occurred - ${strFunc} Args {id} is EMPTY.`, name : 'ARGS_EMPTY',notifyOff : true,});

			objReturn = {
				ID 			: '',
				FILENAME 	: '',
				TYPE 		: '',
				FOLDER 		: '',
				AFTEREXPORT : '',
				FILETYPE 	: '',
				LINES 		: new Array(),
			}

			// log.debug('intId',intId)
			let arrFilters = new Array();
			arrFilters.push(search.createFilter({name : 'internalid',operator : search.Operator.ANYOF,values : intId}))
			arrFilters.push(search.createFilter({name : 'isinactive',operator : search.Operator.IS,values : 'F'}))

			let arrColumns = new Array();
			arrColumns.push(search.createColumn({name : TMPLHEADER.FIELDS.FILENAME}))
			arrColumns.push(search.createColumn({name : TMPLHEADER.FIELDS.TYPE}))
			arrColumns.push(search.createColumn({name : TMPLHEADER.FIELDS.FOLDER}))
			arrColumns.push(search.createColumn({name : TMPLHEADER.FIELDS.AFTEREXPORT}))
			arrColumns.push(search.createColumn({name : TMPLHEADER.FIELDS.FILETYPE}))


			let intCounter = 0;
			//get header expecting 1 result
			search.create({type : TMPLHEADER.ID, filters :arrFilters, columns : arrColumns}).run().each((objRow)=>{

				objReturn.ID = objRow.id;
				objReturn.FILENAME = objRow.getValue(arrColumns[intCounter++]) || false;
				objReturn.TYPE = objRow.getValue(arrColumns[intCounter++]) || false;
				objReturn.FOLDER = objRow.getValue(arrColumns[intCounter++]) || false;
				objReturn.AFTEREXPORT = objRow.getValue(arrColumns[intCounter++]) || false;
				objReturn.FILETYPE = objRow.getValue(arrColumns[intCounter++]) || false;

			})
			//search for child templates
			arrFilters = new Array();
			arrFilters.push(search.createFilter({name : TMPLLINES.FIELDS.PARENT,operator : search.Operator.ANYOF,values : intId}))
			arrFilters.push(search.createFilter({name : 'isinactive',operator : search.Operator.IS,values : 'F'}))

			arrColumns = new Array();
			arrColumns.push(search.createColumn({name : TMPLLINES.FIELDS.SAVEDSEARCH}))
			arrColumns.push(search.createColumn({name : TMPLLINES.FIELDS.TEMPLATE}))
			arrColumns.push(search.createColumn({name : TMPLLINES.FIELDS.FIELDID}))
			arrColumns.push(search.createColumn({name : TMPLLINES.FIELDS.JOINFIELDID}))
			arrColumns.push(search.createColumn({name : TMPLLINES.FIELDS.EXITONEMPTY}))
			arrColumns.push(search.createColumn({name : TMPLLINES.FIELDS.SINGLERESULT}))
			arrColumns.push(search.createColumn({name : TMPLLINES.FIELDS.JOINFIELDUPLVL}))
			arrColumns.push(search.createColumn({name : TMPLLINES.FIELDS.CUSTOMDATA}))
			arrColumns.push(search.createColumn({name : TMPLLINES.FIELDS.SPECIALFUNCTION}))


			//set sort 
			arrColumns.push(search.createColumn({name : TMPLLINES.FIELDS.ORDER, sort:search.Sort.ASC}));

			let arrLines = new Array();

			search.create({type : TMPLLINES.ID, filters : arrFilters, columns : arrColumns}).run().each((objRow)=>{

				intCounter = 0;
				let arrLine = {
					SAVEDSEARCH 	: objRow.getValue(arrColumns[intCounter++]) || false,
					TEMPLATE 		: objRow.getValue(arrColumns[intCounter++]) || false,
					FIELDID 		: objRow.getValue(arrColumns[intCounter++]) || false,
					JOINFIELDID 	: objRow.getValue(arrColumns[intCounter++]) || false,
					EXITONEMPTY 	: objRow.getValue(arrColumns[intCounter++]) || false,
					SINGLERESULT 	: objRow.getValue(arrColumns[intCounter++]) || false,
					JOINFIELDUPLVL 	: objRow.getValue(arrColumns[intCounter++]) || false,
					CUSTOMDATA 		: objRow.getValue(arrColumns[intCounter++]) || false,
					SPECIALFUNCTION : objRow.getValue(arrColumns[intCounter++]) || false,
				}

				//then push to placeholder
				arrLines.push(arrLine);

				return true;
			})

			log.debug('TEMPLATE LINES COUNT',arrLines.length);

			//then merge to objReturn
			if(arrLines.length > 0)
				objReturn.LINES = arrLines;


		}catch(e){
			log.error(`UNEXPECTED ERROR ${strFunc}`,e.message);
		}

		log.debug(`END ${strFunc}`,objReturn)
		return objReturn;

	}


//------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------
	function getConstants(){
		return TMPLCons
	}

	return {
		getConstants : getConstants,

		produceIntegrationMessage : produceIntegrationMessage,
		fetchTemplateComponents : fetchTemplateComponents,

	}


})