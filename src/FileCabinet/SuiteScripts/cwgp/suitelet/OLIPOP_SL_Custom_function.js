/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
  "N/record",
  "N/runtime",
  "N/task",
  "N/ui/serverWidget",
  "N/url",
  "../library/OLIPOP_LIB_LotTraceability",
] /**
 * @param{runtime} runtime
 * @param{task} task
 * @param{serverWidget} serverWidget
 * @param{url} url
 */, (record, runtime, task, serverWidget, url, LT_LIB) => {
  const {
    CUSTOM_RECORDS: { LOT_TRACEABILITY },
  } = LT_LIB;
  const { FIELDS } = LOT_TRACEABILITY;

  /**
   * Defines the Suitelet script trigger point.
   * @param {Object} scriptContext
   * @param {ServerRequest} scriptContext.request - Incoming request
   * @param {ServerResponse} scriptContext.response - Suitelet response
   * @since 2015.2
   */
  const onRequest = (scriptContext) => {
    const { request, response } = scriptContext;

    const params = request.parameters;

    log.audit("Params", params);

    if (request.method === "GET") {
    } else {
      const { dataObj, action } = params;
      try {
        switch (action) {
          case "createLotTraceability":
            {
              let { componentLots, assemblyId } = JSON.parse(dataObj);
              log.audit("componentLots", componentLots);
              if (componentLots.length !== 0) {
                const createdIds = [];
                componentLots.forEach((lot) => {
                  log.audit("Processing Lot", lot);
                  lot.assemblyId = assemblyId;
                  createdIds.push(createLotTraceability(lot));
                });

                log.audit("Created Lot Traceability IDs", createdIds);
                response.write(
                  JSON.stringify({
                    status: "Created Lot Traceability IDs",
                    createdIds,
                  }),
                );
              }
            }
            break;
          default:
            response.write(
              JSON.stringify({
                status: "FAILED",
                message: "Unknown action",
              }),
            );
        }
      } catch (e) {
        log.error("POST}", {
          error: e.message,
          statck: e.stack,
        });
        response.write(
          JSON.stringify({
            status: "FAILED",
            message: e.message,
          }),
        );
      }
    }
  };
  /**
   * ---------------------------------------------------------------------
   *
   * @function createLotTraceability
   *
   * @description
   * Creates a Lot Traceability custom record using provided data.
   *
   * @param {Object} options
   * @param {string} options.lotNumber
   * @param {number|string} options.item
   * @param {string|Date} options.expirationDate
   * @param {number} options.quantity
   * @param {number|string} options.location
   * @param {number|string} options.id - Source transaction internal ID
   * @param {string} options.status - Inventory status text
   * @param {string} [options.error] - Error message, if any
   *
   * @returns {number|string} internal ID of the created record
   *
   * ---------------------------------------------------------------------
   */
  const createLotTraceability = (options = {}) => {
    const functionName = "createLotTraceability";
    log.audit(functionName, { options });
    const QUARANTINED = "14";
    try {
      const {
        lotNumber,
        item,
        expirationDate,
        quantity,
        location,
        assemblyId,
        status = QUARANTINED,
        error,
      } = options;

      const ltRec = record.create({
        type: LOT_TRACEABILITY.ID,
        isDynamic: true,
      });

      // Name + base fields
      ltRec.setValue({ fieldId: "name", value: lotNumber });

      ltRec.setValue({
        fieldId: LOT_TRACEABILITY.FIELDS.LOT_NUMBER,
        value: lotNumber,
      });

      ltRec.setValue({
        fieldId: LOT_TRACEABILITY.FIELDS.ITEM,
        value: item,
      });

      if (expirationDate) {
        // use setText to preserve string-format dates if that matches your workflow
        ltRec.setText({
          fieldId: LOT_TRACEABILITY.FIELDS.EXPIRATION_DATE,
          text: new Date(expirationDate), // 'YYYY-MM-DD'
        });
      }

      ltRec.setValue({
        fieldId: FIELDS.QUANTITY,
        value: quantity,
      });

      ltRec.setValue({
        fieldId: FIELDS.LOCATION,
        value: location,
      });

      ltRec.setValue({
        fieldId: FIELDS.SOURCE_TRANSACTION,
        value: assemblyId,
      });

      ltRec.setValue({
        fieldId: FIELDS.STATUS,
        value: QUARANTINED,
      });

      if (error) {
        ltRec.setValue({
          fieldId: FIELDS.ERROR,
          value: String(error),
        });
      }

      const recId = ltRec.save({ ignoreMandatoryFields: true });

      log.audit(functionName, { recId, lotNumber, item, assemblyId });
      return recId;
    } catch (error) {
      log.error(functionName, {
        error: error.message,
        stack: error.stack,
        options,
      });
      throw error;
    }
  };

  return { onRequest };
});
