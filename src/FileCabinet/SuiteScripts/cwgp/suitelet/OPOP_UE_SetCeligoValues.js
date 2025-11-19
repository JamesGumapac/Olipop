/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

 define(['N/record'], (record) => {
    
    const afterSubmit = (context) => {
        try {
            var intRecordId = context.newRecord.id;
            var strRecordType = context.newRecord.type;
            var eventType = context.type;
            
            if(eventType =='create'){
                var objSO = record.load({
                    type: strRecordType,
                    id: intRecordId,
                    isDynamic: true
                });

                var celigoTaxRate = objSO.getValue({fieldId: 'custbody_cwgp_celigotaxrate'});
                log.debug('celigoTaxRate', celigoTaxRate);
                if(celigoTaxRate){
                    objSO.setValue({fieldId: 'taxrate', value: celigoTaxRate});
                }

                var idSO = objSO.save();
                log.debug('idSO', idSO);
            }

        } catch (ex) {
            log.error('error', ex);
        }
    }
    return {       
        afterSubmit
    };
});
