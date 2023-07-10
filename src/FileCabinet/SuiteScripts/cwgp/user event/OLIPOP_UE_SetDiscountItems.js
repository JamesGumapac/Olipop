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

		const DISCOUNT_ITEM = 5593;

		const SALES_CHANNEL_LIST = {
			WHOLESALE: 1,
			ECOMMS: 2,
			FOODSERVICE: 3,
		}

		const CUST_DIS = {
			DISC12PK: 'custentity_cwgp_12pkdiscount', //12PK
			DISC6PK: 'custentity_cwgp_6pk_discount', //6PK
			MPDISC: 'custentity_cwgp_mpdiscount',  //MULTIPACK
		}

		// Getting the sales units get the internal unittype ID.
		// Read as internal ID - reference field and actual field name.
		const LIST_OF_UNITS = {
			//SET FOR 12PK
			'1': {FIELDREF: 'custentity_cwgp_12pkdiscount', NAME: '12 Pack	'}, 	//12PK DISCOUNT REFERENCE.
			'2': {FIELDREF: 'custentity_cwgp_12pkdiscount', NAME: '2X12 Pack'}, 	//12PK DISCOUNT REFERENCE.
			//SET FOR 6PK
			'4': {FIELDREF: 'custentity_cwgp_6pk_discount', NAME: '6 Pack'}, 		//6PK DISCOUNT REFERENCE.
			'60': {FIELDREF: 'custentity_cwgp_6pk_discount', NAME: '4x6 Packs'},	//6PK DISCOUNT REFERENCE.
			//SET FOR MPs
			'63': {FIELDREF: 'custentity_cwgp_mpdiscount', NAME: '6x4 Pack'},		//MP DISCOUNT REFERENCE.
			'64': {FIELDREF: 'custentity_cwgp_mpdiscount', NAME: '4x6 Packs'},	//MP DISCOUNT REFERENCE.
			'65': {FIELDREF: 'custentity_cwgp_mpdiscount', NAME: '3X8 Pack'},		//MP DISCOUNT REFERENCE.
			'66': {FIELDREF: 'custentity_cwgp_mpdiscount', NAME: '2X12 Pack'},	//MP DISCOUNT REFERENCE.
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
				var int12PK = Number(objLookUp.custentity_cwgp_12pkdiscount);
				var int6PK = Number(objLookUp.custentity_cwgp_6pk_discount);
				var MPDISC = Number(objLookUp.custentity_cwgp_mpdiscount);
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
						if ('custentity_cwgp_12pkdiscount' == LIST_OF_UNITS[stUnit].FIELDREF) {
							discountReference = int12PK;
						}
						else if ('custentity_cwgp_6pk_discount' == LIST_OF_UNITS[stUnit].FIELDREF) {
							discountReference = int6PK;
						}
						else if ('custentity_cwgp_mpdiscount' == LIST_OF_UNITS[stUnit].FIELDREF) {
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

		return {beforeSubmit}

	});
