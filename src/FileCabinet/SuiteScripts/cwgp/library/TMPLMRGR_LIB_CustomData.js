/**
* TMPLMRGR_LIB_CustomData.js
* @NApiVersion 2.1
* @NModuleScope Public
* @NAmdConfig ../namdconfig/TMPLMRGR_CONF_namdconfig.json
*
* Author : maquino
* Date : October 22, 2021
*
* Modifications
*
*/

var dependencies = ['TMPLMRGRGlobalCons','N/record','N/search','N/runtime','N/format','N/error','N/encode','N/file','N/xml'];

define(dependencies,function(TMPLMRGRCONS,record,search,runtime,format,error,encode,file,xml){

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


	/**
	* Constructor
	* @param {Object} paramObj - 
	*/

	function __construct(){

		let _self = {}

		//START CUSTOM FUNCTIONS HERE
		_self.dynamicFootprint = (paramObj)=>{

			let arrReturn = new Array();
			let strFunc = 'dynamicFootprint'

			try{

				let {objSearch,strCriteria,intId,} = paramObj


				log.debug(`START ${strFunc}`,paramObj);

				let arrFilters = [...objSearch.filterExpression];
				if(arrFilters.length > 0)
					arrFilters.push('AND');				

				arrFilters.push([strCriteria,search.Operator.ANYOF,intId]);

				//set filters
				objSearch.filters = null;
				objSearch.filterExpression = arrFilters;

				log.debug('filterExpression',arrFilters);

				let arrColumns = [...objSearch.columns];				

				//perform search
				let objPagedData = objSearch.runPaged({pageSize : 1000});
				intResultCount = objPagedData.count;	

				log.debug('intResultCount',intResultCount)		

				for( var i=0; i < objPagedData.pageRanges.length; i++ ) {
					let objCurrentPage = objPagedData.fetch({index:i});
					objCurrentPage.data.forEach((objRow,intRowIndex)=>{

						let objLine = {}

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

							objLine[strLabel] = strValue;

						})

						arrReturn.push(objLine);

					})

				}

				//CUSTOM ATTRIBUTES
				//${UOMLVL} , ${PAL_FLG},${CAS_FLG},${PAK_FLG},${STK_FLG},${RCV_FLG}

				let intLayers = parseInt(arrReturn.length||0);

				log.debug('intLayers',intLayers)

				let objConfigLayers = {};
				//for 2 levels only
				objConfigLayers.base2level 	= {'${PAL_FLG}' : 0,	'${CAS_FLG}' :1, 	'${PAK_FLG}' :0,	'${STK_FLG}' : 1, 	'${RCV_FLG}' : 1}

				objConfigLayers.base 		= {'${PAL_FLG}' : 0,	'${CAS_FLG}' :0, 	'${PAK_FLG}' :0,	'${STK_FLG}' : 1, 	'${RCV_FLG}' : 1}
				objConfigLayers.innerPack 	= {'${PAL_FLG}' : 0,	'${CAS_FLG}' :0, 	'${PAK_FLG}' :1, 	'${STK_FLG}' : 0, 	'${RCV_FLG}' : 0}
				objConfigLayers.case 		= {'${PAL_FLG}' : 0,	'${CAS_FLG}' :1, 	'${PAK_FLG}' :0, 	'${STK_FLG}' : 0, 	'${RCV_FLG}' : 0}
				objConfigLayers.pallet 		= {'${PAL_FLG}' : 1,	'${CAS_FLG}' :0, 	'${PAK_FLG}' :0, 	'${STK_FLG}' : 0, 	'${RCV_FLG}' : 0}


				log.debug('BEFORE arrReturn',arrReturn)
				if(intLayers == 1){
					log.debug('layer 1')
					arrReturn[0] = {...arrReturn[0], ...objConfigLayers.base}
				}else if(intLayers == 2){
					log.debug('layer 2')
					arrReturn[0] = {...arrReturn[0], ...objConfigLayers.base2level}
					arrReturn[1] = {...arrReturn[1], ...objConfigLayers.pallet}

					// arrReturn[0] = Object.assign(arrReturn[0],objConfigLayers.base)
					// arrReturn[1] = Object.assign(arrReturn[1],objConfigLayers.pallet)
				}else if(intLayers == 3){
					log.debug('layer 3')
					arrReturn[0] = {...arrReturn[0], ...objConfigLayers.base}
					arrReturn[1] = {...arrReturn[1], ...objConfigLayers.case}
					arrReturn[2] = {...arrReturn[2], ...objConfigLayers.pallet}
				}else if (intLayers >= 4){
					log.debug('layer 4')
					arrReturn[0] = {...arrReturn[0], ...objConfigLayers.base}
					arrReturn[1] = {...arrReturn[1], ...objConfigLayers.innerPack}
					arrReturn[2] = {...arrReturn[2], ...objConfigLayers.case}
					arrReturn[3] = {...arrReturn[3], ...objConfigLayers.pallet}						
				}				

			}catch(e){

				log.error(`UNEXPECTED ERROR ${strFunc}`,e.message);

			}

			log.debug(`END ${strFunc}`,arrReturn);

			return arrReturn;
		}

		//Transferorder Quantity - Backordered
		_self.TOCalcBackorderedQuantity = (paramObj)=>{

			let arrReturn = new Array();
			let strFunc = 'TOCalcBackorderedQuantity'

			try{

				let {objSearch,strCriteria,intId,} = paramObj

				log.debug(`START ${strFunc}`,paramObj);

				let arrFilters = [...objSearch.filterExpression];
				if(arrFilters.length > 0)
					arrFilters.push('AND');				

				arrFilters.push([strCriteria,search.Operator.ANYOF,intId]);

				//set filters
				objSearch.filters = null;
				objSearch.filterExpression = arrFilters;

				log.debug('filterExpression',arrFilters);

				// let arrColumns = new Array();
				let arrColumns = [...objSearch.columns];	
				// arrColumns.push(search.createColumn({name : 'transferorderitemline',	label : '${INVLIN}'}))
				// arrColumns.push(search.createColumn({name : 'quantity',					label : '${EXPQTY}'}))
				// arrColumns.push(search.createColumn({name : 'item',  					label : '${PRTNUM}'}))

				//perform search
				let objPagedData = objSearch.runPaged({pageSize : 1000});
				intResultCount = objPagedData.count;	

				log.debug('intResultCount',intResultCount)		

				for( var i=0; i < objPagedData.pageRanges.length; i++ ) {
					let objCurrentPage = objPagedData.fetch({index:i});
					objCurrentPage.data.forEach((objRow,intRowIndex)=>{

						let objLine = {}

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

							objLine[strLabel] = strValue;

						})

						arrReturn.push(objLine);

					})

				}

				log.debug(`pre-modification arrReturn`,JSON.stringify(arrReturn));

				//then load record and get backordered per line
				let objTORecord = record.load({type : 'transferorder', id : intId, isDynamic : true});
				let arrIndexToSplice = new Array();
				arrReturn.forEach((objLine, intIndex)=>{


					let intNeedle = objLine['${INVLIN}'];
					let intLine = objTORecord.findSublistLineWithValue({sublistId : 'item',fieldId : 'line', value : intNeedle});


					if(intLine != -1){

						objTORecord.selectLine({sublistId : 'item', line: intLine});
						let intFulfilled = parseFloat(objTORecord.getCurrentSublistValue({sublistId : 'item', fieldId : 'quantityfulfilled',}) || 0);
						let intReceived = parseFloat(objTORecord.getCurrentSublistValue({sublistId : 'item', fieldId : 'quantityreceived',}) || 0);

						if((intFulfilled - intReceived) <= 0){
							arrIndexToSplice.push(intIndex)
							// arrReturn.splice(intIndex,1);
							return true;
						}

						arrReturn[intIndex]['${EXPQTY}'] = intFulfilled - intReceived;

					}

				})

				for(let intMax = arrIndexToSplice.length -1; intMax>=0; intMax--){
					arrReturn.splice(arrIndexToSplice[intMax],1)
				}


			}catch(e){
				log.error(`UNEXPECTED ERROR ${strFunc}`,e.message);
			}		

			log.debug(`END ${strFunc}`,arrReturn);

			return arrReturn;			

		}


		//for order notes header
		_self.OrderNotesHeader = (paramObj)=>{

			let arrReturn = new Array();
			let strFunc = 'OrderNotes'
			let intLimit = 60;

			try{				

				let {objSearch,strCriteria,intId,} = paramObj

				log.debug(`START ${strFunc}`,paramObj);


				//ORDNUM, ORDLIN, NOTTXT, NOTTYP
				let strNoteTemplate = "<ORDER_NOTE_SEG><SEGNAM>ORDER_NOTE</SEGNAM><ORDNUM>${ORDNUM}</ORDNUM><NOTLIN>${ORDLIN}</NOTLIN><NOTTXT>${NOTTXT}</NOTTXT><NOTTYP>${NOTTYP}</NOTTYP></ORDER_NOTE_SEG>";

				//templare return;
				let strTemplateReturn = "";

				let intMaxLen = '60';

				let arrFilters = [...objSearch.filterExpression];
				if(arrFilters.length > 0)
					arrFilters.push('AND');				

				arrFilters.push([strCriteria,search.Operator.ANYOF,intId]);

				//set filters
				objSearch.filters = null;
				objSearch.filterExpression = arrFilters;

				log.debug('filterExpression',arrFilters);

				let arrColumns = new Array();;

				arrColumns.push(search.createColumn({name : 'tranid',}))
				arrColumns.push(search.createColumn({name : 'custbody_tfg_credit_remark',}))
				arrColumns.push(search.createColumn({name : 'memo',}))
				arrColumns.push(search.createColumn({name : 'custbody_tfg_addi_remarks',}))
				arrColumns.push(search.createColumn({name : 'custbody_tfg_other_instructions',}))
				arrColumns.push(search.createColumn({name : 'custbody_tfg_packing_instructions',}))
				arrColumns.push(search.createColumn({name : 'custbody_tfg_delivery_instructions_by',}))
				arrColumns.push(search.createColumn({name : 'custbody_tfg_special_shipping_info',}))

				objSearch.columns = arrColumns;

				//perform search
				let objPagedData = objSearch.runPaged({pageSize : 1000});
				intResultCount = objPagedData.count;	

				log.debug('intResultCount',intResultCount);

				let x = 0;

				for( var i=0; i < objPagedData.pageRanges.length; i++ ) {
					let objCurrentPage = objPagedData.fetch({index:i});
					objCurrentPage.data.forEach((objRow,intRowIndex)=>{

						let strOrdNum = objRow.getValue(arrColumns[x++]);
						let intCounter = 1;

						log.debug('strOrdNum',strOrdNum)


						//credit remark
						let strCreditRemark = objRow.getValue(arrColumns[x++]) || false;
						if(strCreditRemark != false){

							log.debug('strCreditRemark',strCreditRemark)
							let strNotType = 'CREDIT_REMARKS';
							let objNotesReturn = _self.notesTrimmer({intLimit :60, strNotType : strNotType, strNotText : strCreditRemark, strOrdNum :strOrdNum, intCounter : intCounter})
							arrReturn = arrReturn.concat(objNotesReturn.arrReturn);
							intCounter = objNotesReturn.intCounter;
						}

						//cs memo
						let strMemo = objRow.getValue(arrColumns[x++]) || false;
						if(strMemo != false){
							log.debug('strMemo',strMemo)
							let strNotType = 'CS_MEMO';
							let objNotesReturn = _self.notesTrimmer({intLimit :60, strNotType : strNotType, strNotText : strMemo, strOrdNum :strOrdNum, intCounter : intCounter});
							arrReturn = arrReturn.concat(objNotesReturn.arrReturn);
							intCounter = objNotesReturn.intCounter;							
						}						

						//additional remarks
						let strAddRemarks = objRow.getValue(arrColumns[x++]) || false;
						if(strAddRemarks != false){
							log.debug('strAddRemarks',strAddRemarks)
							let strNotType = 'CS_NOTE';
							let objNotesReturn = _self.notesTrimmer({intLimit :60, strNotType : strNotType, strNotText : strAddRemarks, strOrdNum :strOrdNum, intCounter : intCounter});
							arrReturn = arrReturn.concat(objNotesReturn.arrReturn);
							intCounter = objNotesReturn.intCounter;							
						}							

						//order instructions
						let strOtrIns = objRow.getValue(arrColumns[x++]) || false;
						if(strOtrIns != false){
							log.debug('strOtrIns',strOtrIns)
							let strNotType = 'OTHER_ORDERINFO';
							let objNotesReturn = _self.notesTrimmer({intLimit :60, strNotType : strNotType, strNotText : strOtrIns, strOrdNum :strOrdNum, intCounter : intCounter});
							arrReturn = arrReturn.concat(objNotesReturn.arrReturn);
							intCounter = objNotesReturn.intCounter;
						}						

						//packing instructions
						let strPckIns = objRow.getValue(arrColumns[x++]) || false;
						if(strPckIns != false){
							log.debug('strPckIns',strPckIns)
							let strNotType = 'PACK_INSTRUCTION';
							let objNotesReturn = _self.notesTrimmer({intLimit :60, strNotType : strNotType, strNotText : strPckIns, strOrdNum :strOrdNum, intCounter : intCounter});
							arrReturn = arrReturn.concat(objNotesReturn.arrReturn);
							intCounter = objNotesReturn.intCounter;
						}												

						//delivery instructions
						let strDelIns = objRow.getValue(arrColumns[x++]) || false;
						if(strDelIns != false){
							log.debug('strDelIns',strDelIns)
							let strNotType = 'REMARKS_VIEWBYCUSTOMER';
							let objNotesReturn = _self.notesTrimmer({intLimit :60, strNotType : strNotType, strNotText : strDelIns, strOrdNum :strOrdNum, intCounter : intCounter});
							arrReturn = arrReturn.concat(objNotesReturn.arrReturn);
							intCounter = objNotesReturn.intCounter;
						}										

						//special shipping 
						let strSpecShip = objRow.getValue(arrColumns[x++]) || false;
						if(strSpecShip != false){
							log.debug('strSpecShip',strSpecShip)
							let strNotType = 'SHIP_INSTRUCTION';
							let objNotesReturn = _self.notesTrimmer({intLimit :60, strNotType : strNotType, strNotText : strSpecShip, strOrdNum :strOrdNum, intCounter : intCounter});
							arrReturn = arrReturn.concat(objNotesReturn.arrReturn);
							intCounter = objNotesReturn.intCounter;
						}		

					})

				}			

			}catch(e){

				log.error(`UNEXPECTED ERROR ${strFunc}`,e.message);

			}

			log.debug(`END ${strFunc}`,arrReturn);

			return arrReturn.join('');
		}		

		//notestrimmer for header
		_self.notesTrimmer = (paramObj) =>{

			log.debug('START notesTrimmer',paramObj)
			let arrReturn = new Array();

			let {intLimit, strNotType, strNotText, strOrdNum,intCounter} = paramObj;

			let strNoteTemplate = "<ORDER_NOTE_SEG><SEGNAM>ORDER_NOTE</SEGNAM><ORDNUM>${ORDNUM}</ORDNUM><NOTLIN>${ORDLIN}</NOTLIN><NOTTXT>${NOTTXT}</NOTTXT><NOTTYP>${NOTTYP}</NOTTYP></ORDER_NOTE_SEG>";

			strNotType = xml.escape({xmlText : strNotType});
			strNotText = xml.escape({xmlText : strNotText});

			while(strNotText.length > 0){
				let strLineTemplate = strNoteTemplate;
				/*
				let strLineNotTxt = strNotText.substr(0,intLimit)
				strNotText = strNotText.substr(intLimit);
				*/

				let strLineNotTxt = strNotText.substring(0, (strNotText + ' ').lastIndexOf(' ', intLimit));

				//if empty
				if(strLineNotTxt == "")
					strLineNotTxt = strNotText.substr(0,intLimit);

				strNotText = strNotText.substr(strLineNotTxt.length);

				if(strLineNotTxt.trim().length>0){
					strLineTemplate = strLineTemplate.replace("${ORDNUM}",strOrdNum);
					strLineTemplate = strLineTemplate.replace("${ORDLIN}",intCounter);
					strLineTemplate = strLineTemplate.replace("${NOTTXT}",strLineNotTxt);
					strLineTemplate = strLineTemplate.replace("${NOTTYP}",strNotType);

					arrReturn.push(strLineTemplate);

					intCounter++;
				}
			}

			return {arrReturn : arrReturn, intCounter : intCounter};

		}

		//for order line notes
		_self.OrderLineNotes = (paramObj)=>{

			let arrReturn = new Array();
			let strFunc = 'OrderLineNotes'
			let intLimit = 60;

			let {strFileContent} = paramObj
			try{				

				let {objSearch,strCriteria,intId} = paramObj
				// arrReturn = arrMergedLines;

				log.debug(`START ${strFunc}`,paramObj);

				//ORDNUM, ORDLIN, NOTTXT, NOTTYP
				let strNoteTemplate = "<ORDER_LINE_NOTE_SEG><SEGNAM>ORDER_LINE_NOTE</SEGNAM><ORDNUM>${ORDNUM}</ORDNUM><NOTLIN>${ORDLIN}</NOTLIN><NOTTXT>${NOTTXT}</NOTTXT><NOTTYP>Pack_Instruction</NOTTYP></ORDER_LINE_NOTE_SEG>";		

				//templare return;
				let strTemplateReturn = "";

				let intMaxLen = '60';

				let arrFilters = [...objSearch.filterExpression];
				if(arrFilters.length > 0)
					arrFilters.push('AND');				

				arrFilters.push([strCriteria,search.Operator.ANYOF,intId]);

				//set filters
				objSearch.filters = null;
				objSearch.filterExpression = arrFilters;

				log.debug('filterExpression',arrFilters);

				let arrColumns = new Array();

				arrColumns.push(search.createColumn({name : 'tranid',})) //ordnum
				arrColumns.push(search.createColumn({name : 'line',join : 'appliedToTransaction'})) //forswapping
				arrColumns.push(search.createColumn({name : 'custcol_tfg_repack_notes',})) //NOTTXT

				objSearch.columns = arrColumns;

				let objNeedles = {};

				//perform search
				let objPagedData = objSearch.runPaged({pageSize : 1000});
				intResultCount = objPagedData.count;	

				log.debug('intResultCount',intResultCount);

				let x = 0;

				for( var i=0; i < objPagedData.pageRanges.length; i++ ) {
					let objCurrentPage = objPagedData.fetch({index:i});
					objCurrentPage.data.forEach((objRow,intRowIndex)=>{

						let strOrdNum = objRow.getValue(arrColumns[0]);
						let intOrderLine = objRow.getValue(arrColumns[1]);
						let strNotes = objRow.getValue(arrColumns[2]);

						let strNeedle = "${_ORDER_LINE_NOTE_SEG"+intOrderLine+"}";

						if(objNeedles.hasOwnProperty(strNeedle) == false){
							objNeedles[strNeedle] = "";
						}

						let intCounter = 1;
						let objNotesReturn = _self.lineNotesTrimmer({intLimit :60, strNotText : strNotes, strOrdNum :strOrdNum, intCounter : intCounter, intOrderLine : intOrderLine})

						log.debug(`strNeedle ${strNeedle}`,objNotesReturn);
						objNeedles[strNeedle] = objNotesReturn;

					})

				}

				//loop thru merged lines and look for objNeedles with it's notes
				//@TODO		

				log.debug('REPLACE PROCESS')
				Object.keys(objNeedles).forEach((strOrderLineNeedle)=>{

					log.debug(`NEEDLE ${strOrderLineNeedle}`);

					strFileContent = strFileContent.replace(strOrderLineNeedle,objNeedles[strOrderLineNeedle]);

				})


			}catch(e){

				log.error(`UNEXPECTED ERROR ${strFunc}`,e.message);

			}

			log.debug(`END ${strFunc}`,strFileContent);

			return strFileContent;
		}	

		_self.lineNotesTrimmer = (paramObj)=>{
			log.debug('START lineNotesTrimmer',paramObj)

			let strReturn = "";
			let arrPlaceholder = new Array();

			let {intLimit, strNotText, strOrdNum,intCounter, intOrderLine} = paramObj;

			let strNoteTemplate = "<ORDER_LINE_NOTE_SEG><SEGNAM>ORDER_LINE_NOTE</SEGNAM><ORDNUM>${ORDNUM}</ORDNUM><NOTLIN>${NOTLIN}</NOTLIN><ORDLIN>${ORDLIN}</ORDLIN><ORDSLN>0000</ORDSLN><NOTTXT>${NOTTXT}</NOTTXT><NOTTYP>Pack_Instruction</NOTTYP></ORDER_LINE_NOTE_SEG>";					

			strNotText = xml.escape({xmlText : strNotText});

			while(strNotText.length > 0){
				let strLineTemplate = strNoteTemplate;

				let strLineNotTxt = strNotText.substring(0, (strNotText + ' ').lastIndexOf(' ', intLimit));

				//if empty
				if(strLineNotTxt == "")
					strLineNotTxt = strNotText.substr(0,intLimit);

				strNotText = strNotText.substr(strLineNotTxt.length);

				if(strLineNotTxt.trim().length>0){

					strLineTemplate = strLineTemplate.replace("${ORDNUM}",strOrdNum);
					strLineTemplate = strLineTemplate.replace("${NOTLIN}",intCounter);
					strLineTemplate = strLineTemplate.replace("${NOTTXT}",strLineNotTxt);
					strLineTemplate = strLineTemplate.replace("${ORDLIN}",intOrderLine);

					arrPlaceholder.push(strLineTemplate);

				intCounter++;
				}				
			}
			log.debug('END lineNotesTrimmer',arrPlaceholder.join(''))

			return arrPlaceholder.join('');
		}

		return _self;

	}


//------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------

	return {

		__construct : __construct, 
		// notesTrimmer : notesTrimmer,

	}


})