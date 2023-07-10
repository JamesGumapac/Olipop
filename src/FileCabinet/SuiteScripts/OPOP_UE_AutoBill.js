/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * 
 * Created by: Jared Espineli
 * Date Created: 01/18/2023
 * 
 * Version             Date Modified                Modified By
 * 1.01                03/21/2023                   Jared Espineli
 * 2.00                05/04/2023                   Erick Dela Rosa
 */

define(['N/record', 'N/search'], (record, search) => {

    /**
     * Automatically creates Cash Sale Record for Sales Order where Status = Pending Billing AND Shopify Order ID != NULL
     */
    const afterSubmit = (context) => {
        try {            
            log.debug('context type', context.type);
            if(context.type == 'delete') return;

            var intRecordId = context.newRecord.id;
            
            var recIF = record.load({
                type: record.Type.ITEM_FULFILLMENT,
                id: intRecordId
            });

            var createdFrom = recIF.getValue({fieldId: 'createdfrom'});
            log.debug('createdFrom', createdFrom);

            var tranDateIF = recIF.getValue({fieldId: 'trandate'});
            log.debug('tranDateIF', tranDateIF);            

            if(createdFrom){
                var arrSalesChannel = ['1', '2', '3'];
                var arrStatus = ['pendingBilling', 'pendingBillingPartFulfilled']

                var orderLookup = search.lookupFields({ //lookup value in Sales Order related to IF
                    type: search.Type.SALES_ORDER,
                    id: createdFrom,
                    columns: ['status', 'custbody_olipop_shopify_ordid', 'class', 'paymentmethod', 'entity']
                });

                log.debug('orderLookup', orderLookup);
                var orderStatus = orderLookup.status[0].value;
                var shopifyID = orderLookup.custbody_olipop_shopify_ordid;
                var salesChannel = orderLookup.class[0].value;                  

              	var paymentMethod = [];
              	if(orderLookup.paymentmethod.length > 0){
                	paymentMethod = orderLookup.paymentmethod[0].value;  
                }                
                log.debug('orderStatus | salesChannel | paymentMethod', [orderStatus, salesChannel, paymentMethod]);

                if(arrStatus.indexOf(orderStatus) > -1 && arrSalesChannel.indexOf(salesChannel) > -1){  //set condition to check SO Status and if Sales Channel is either E-Commerce, Wholesale, or Food Service          
                    if(!isEmpty(shopifyID)){ //to handle Shopify Orders
                        if(paymentMethod.length > 0 && orderStatus == 'pendingBilling'){ //only those with payment method will be considered
                            log.debug('shopify order with payment method');
                            var recTran = record.transform({
                                fromType: record.Type.SALES_ORDER,
                                fromId: createdFrom,
                                toType: record.Type.CASH_SALE,
                                isDynamic: true,
                            });
                        }                        
                    }else{ //to handle other orders
                        if(paymentMethod.length == 0 && salesChannel != '2'){ //only consider orders without payment method where status if Wholesale or Food Service
                            log.debug('other order with payment method');
                            var recTran = record.transform({
                                fromType: record.Type.SALES_ORDER,
                                fromId: createdFrom,
                                toType: record.Type.INVOICE,
                                isDynamic: true,
                            });
                        }
                    }                                                                                                   

                    if(recTran){
                        recTran.setValue({fieldId: 'trandate', value: tranDateIF}); //Set Invoice/Cash Sale Date based on IF date

                        /**JAE v1.01
                         * Added update to check customer in Sales Order to set Integration status in Invoice record
                        */
                        var intCustomer = orderLookup.entity[0].value;
                        var arrCustomers = ['2515', '2516'];

                        //customer value lookup for integration status
                        var objCustomer = record.load({
                            type: record.Type.CUSTOMER,
                            id: intCustomer
                        })
                        var customerParent = objCustomer.getValue({fieldId: 'parent'});
                        log.debug('customerParent', customerParent);
                        if(arrCustomers.indexOf(intCustomer) > -1 || (customerParent == '2515' || customerParent == '2516')){
                            recTran.setValue({fieldId: 'custbodyintegrationstatus', value: 1});
							//Erick Dela Rosa 05/04/2023: Added setting of custbody_sps_foblocationqualifier and custbody_sps_fobpaycode
							recTran.setValue({fieldId: 'custbody_sps_foblocationqualifier', value: 'OR'});
							recTran.setValue({fieldId: 'custbody_sps_fobpaycode', value: 'PP'});
                        }

                        var idTran = recTran.save();
                        log.debug('idTran', idTran);
                    }
                    
                }else{
                    return;
                }
            }            
        } catch (ex) {
            log.error('error', ex);
        }
    }

    /**
     * check if string is empty
     */
    function isEmpty(stValue)
	{
    	return ((stValue === '' || stValue == null || stValue == undefined)
    			|| (stValue.constructor === Array && stValue.length == 0)
    			|| (stValue.constructor === Object && (function(v){for(var k in v)return false;return true;})(stValue)));
	}

    return {
        afterSubmit
    };
});