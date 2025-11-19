/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

/*******************************************************************
* Version: 1.0.0
* Author: Gary Yap
* Purpose: UE for Discount Item addition.
* ******************************************************************* */

define(['N/record', 'N/runtime', 'N/search'],
	/**
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 */
	(record, runtime, search) => {

		const DISCOUNT_ITEM = 3571;

		const SALES_CHANNEL_LIST = {
			WHOLESALE: 1,
			ECOMMS: 2,
			FOODSERVICE: 3,
		}

		const CUST_DIS = {
			DISC12PK: 'custentityoi_discount_12pk', //12PK
			DISC6PK: 'custentityoi_discount_6pk', //6PK
			MPDISC: 'custentityoi_discount_mp',  //MULTIPACK
		}

		// Getting the sales units get the internal unittype ID.
		// Read as internal ID - reference field and actual field name.
		const LIST_OF_UNITS = {
			//SET FOR 12PK
			'1': {FIELDREF: 'custentityoi_discount_12pk', NAME: '12 Pack	'}, 	//12PK DISCOUNT REFERENCE.
			'2': {FIELDREF: 'custentityoi_discount_12pk', NAME: '2X12 Pack'}, 	//12PK DISCOUNT REFERENCE.
			'74': {FIELDREF: 'custentityoi_discount_12pk', NAME: '12 Pack Sleek'},//12PK DISCOUNT REFERENCE. //2025-Feb-19: Added by eddelarosa as requested by Olipop
			//SET FOR 6PK
			'4': {FIELDREF: 'custentityoi_discount_6pk', NAME: '6 Pack'}, 		//6PK DISCOUNT REFERENCE.
			'60': {FIELDREF: 'custentityoi_discount_6pk', NAME: '4x6 Packs'},	//6PK DISCOUNT REFERENCE.
			//SET FOR MPs
			'63': {FIELDREF: 'custentityoi_discount_mp', NAME: '6x4 Pack'},		//MP DISCOUNT REFERENCE.
			'64': {FIELDREF: 'custentityoi_discount_mp', NAME: '4x6 Packs'},	//MP DISCOUNT REFERENCE.
			'65': {FIELDREF: 'custentityoi_discount_mp', NAME: '3X8 Pack'},		//MP DISCOUNT REFERENCE.
			'66': {FIELDREF: 'custentityoi_discount_mp', NAME: '2X12 Pack'},	//MP DISCOUNT REFERENCE.
		}
		const beforeLoad = (scriptContext) => {
			var objCurRec = scriptContext.newRecord;
			if (scriptContext.type !== scriptContext.UserEventType.CREATE) return;
			if(objCurRec.type == record.Type.INVOICE ){
				var intCreatedFrom = objCurRec.getValue({fieldId: 'createdfrom'});
				if (!intCreatedFrom) return;
				var objSOStatusLookup = search.lookupFields({
					type: search.Type.TRANSACTION,
					id: intCreatedFrom,
					columns: ['status']
				}).status[0].text;
				log.debug('objSOStatusLookup', typeof objSOStatusLookup + ' ' + JSON.stringify(objSOStatusLookup))
				var intOilDiscountLine = objCurRec.findSublistLineWithValue({
					sublistId: 'item',
					fieldId: 'item',
					value: DISCOUNT_ITEM
				});
				log.debug('intOilDiscountLine', intOilDiscountLine);
				if(intOilDiscountLine !== -1 && (objSOStatusLookup == 'Partially Fulfilled' || objSOStatusLookup == 'Pending Billing/Partially Fulfilled')) {
					while(intOilDiscountLine !== -1){
						objCurRec.removeLine({
							sublistId: 'item',
							line: intOilDiscountLine
						});
						intOilDiscountLine = objCurRec.findSublistLineWithValue({
							sublistId: 'item',
							fieldId: 'item',
							value: DISCOUNT_ITEM
						});
					}
					
					var intEntity = objCurRec.getValue({fieldId: 'entity'});
					var objLookUp = search.lookupFields({
						type: search.Type.CUSTOMER,
						id: intEntity,
						columns: [CUST_DIS.DISC12PK, CUST_DIS.DISC6PK, CUST_DIS.MPDISC]
					});
					
					//Setup for the different reference values.
					var int12PK = Number(objLookUp.custentityoi_discount_12pk);
					var int6PK = Number(objLookUp.custentityoi_discount_6pk);
					var MPDISC = Number(objLookUp.custentityoi_discount_mp);
					log.debug('Discounts', 'int12PK: ' + int12PK + ' int6PK: ' + int6PK + ' MPDISC: ' + MPDISC);

					var intLineNum = Number(objCurRec.getLineCount({sublistId: 'item'}));
					log.debug('intLineNum', intLineNum);

					// Going from bottom up allows for adding of lines without changing reference as this is a pushdown update.
					for (var i = (intLineNum - 1); i >= 0; i--) {
						var stUnit = objCurRec.getSublistValue({sublistId: 'item', fieldId: 'units', line: i});
						log.debug('stUnit', stUnit);

						// Compare to the list of available UoMs
						if (LIST_OF_UNITS.hasOwnProperty(stUnit) == true) {
							log.debug('LIST_OF_UNITS', 'LineNum: ' + i);
							var discountReference = 0;

							//Setting the reference discount.
							if ('custentityoi_discount_12pk' == LIST_OF_UNITS[stUnit].FIELDREF) {
								discountReference = int12PK;
							}
							else if ('custentityoi_discount_6pk' == LIST_OF_UNITS[stUnit].FIELDREF) {
								discountReference = int6PK;
							}
							else if ('custentityoi_discount_mp' == LIST_OF_UNITS[stUnit].FIELDREF) {
								discountReference = MPDISC;
							}

							var intQuantity = objCurRec.getSublistValue({sublistId: 'item', fieldId: 'quantity', line: i});

							// Multiply to -1 to convert to positive. Discount items will be auto negative line level.
							var intAmount = discountReference * intQuantity * -1;
							log.debug('intAmount', intAmount);

							//If the discount type in the customer is empty, do not add lines.
							if (0 != discountReference) {
								// Add +1 to insert to push everything forward and not back.
								var intInsert = i + 1;
								objCurRec.insertLine({sublistId: 'item', line: intInsert, });
								objCurRec.setSublistValue({sublistId: 'item', fieldId: 'item', line: intInsert, value: DISCOUNT_ITEM});
								objCurRec.setSublistValue({sublistId: 'item', fieldId: 'rate', line: intInsert, value: intAmount});
							}
						}
					}
				}
			}
				
		}
		/**
		 * Defines the function definition that is executed before record is submitted.
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.newRecord - New record
		 * @param {Record} scriptContext.oldRecord - Old record
		 * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
		 * @since 2015.2
		 */
		const beforeSubmit = (scriptContext) => {
			log.debug('Start', 'Script Entered');

			if (scriptContext.type !== scriptContext.UserEventType.CREATE)
				return;

			var objCurRec = scriptContext.newRecord;
			if(objCurRec.type == record.Type.SALES_ORDER){
				var intSalesChannel = objCurRec.getValue({fieldId: 'class'});
				log.debug('intSalesChannel', intSalesChannel);

				// If not ecommerce perform addition of discount.
				// Added request 03/23/2023 - do not run if NULL sales channel.
				if (intSalesChannel != SALES_CHANNEL_LIST.ECOMMS && (intSalesChannel != null || intSalesChannel != '')) {
					var intEntity = objCurRec.getValue({fieldId: 'entity'});
					var objLookUp = search.lookupFields({
						type: search.Type.CUSTOMER,
						id: intEntity,
						columns: [CUST_DIS.DISC12PK, CUST_DIS.DISC6PK, CUST_DIS.MPDISC]
					});

					//Setup for the different reference values.
					var int12PK = Number(objLookUp.custentityoi_discount_12pk);
					var int6PK = Number(objLookUp.custentityoi_discount_6pk);
					var MPDISC = Number(objLookUp.custentityoi_discount_mp);
					log.debug('Discounts', 'int12PK: ' + int12PK + ' int6PK: ' + int6PK + ' MPDISC: ' + MPDISC);

					var intLineNum = Number(objCurRec.getLineCount({sublistId: 'item'}));
					log.debug('intLineNum', intLineNum);

					// Going from bottom up allows for adding of lines without changing reference as this is a pushdown update.
					for (var i = (intLineNum - 1); i >= 0; i--) {
						var stUnit = objCurRec.getSublistValue({sublistId: 'item', fieldId: 'units', line: i});
						log.debug('stUnit', stUnit);

						// Compare to the list of available UoMs
						if (LIST_OF_UNITS.hasOwnProperty(stUnit) == true) {
							log.debug('LIST_OF_UNITS', 'LineNum: ' + i);
							var discountReference = 0;

							//Setting the reference discount.
							if ('custentityoi_discount_12pk' == LIST_OF_UNITS[stUnit].FIELDREF) {
								discountReference = int12PK;
							}
							else if ('custentityoi_discount_6pk' == LIST_OF_UNITS[stUnit].FIELDREF) {
								discountReference = int6PK;
							}
							else if ('custentityoi_discount_mp' == LIST_OF_UNITS[stUnit].FIELDREF) {
								discountReference = MPDISC;
							}

							var intQuantity = objCurRec.getSublistValue({sublistId: 'item', fieldId: 'quantity', line: i});

							// Multiply to -1 to convert to positive. Discount items will be auto negative line level.
							var intAmount = discountReference * intQuantity * -1;
							log.debug('intAmount', intAmount);

							//If the discount type in the customer is empty, do not add lines.
							if (0 != discountReference) {
								// Add +1 to insert to push everything forward and not back.
								var intInsert = i + 1;
								objCurRec.insertLine({sublistId: 'item', line: intInsert, });
								objCurRec.setSublistValue({sublistId: 'item', fieldId: 'item', line: intInsert, value: DISCOUNT_ITEM});
								objCurRec.setSublistValue({sublistId: 'item', fieldId: 'rate', line: intInsert, value: intAmount});
							}
						}
					}
					var intTotal = objCurRec.getValue({fieldId: 'total'});
					log.debug('intTotal', intTotal);

				}
				log.debug('End', 'Script Complete');
			}
		}

		return {beforeLoad, beforeSubmit}

	});
