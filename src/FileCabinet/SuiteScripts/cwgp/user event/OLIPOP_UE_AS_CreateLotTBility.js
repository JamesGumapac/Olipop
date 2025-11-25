/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @description Component Lots sublist on Assembly Build (tab custom1810)
 */
define([
  "N/ui/serverWidget",
  "N/search",
  "N/record",
  "N/log",
  "N/url",
  "N/https",
], (serverWidget, search, record, log, url, https) => {
  /**
   * Retrieves a list of unique component item IDs associated with a Bill of Materials (BOM) revision
   * from the provided record.
   *
   * This function processes both a custom field (`custrecord_mfgmob_mm_auto_issue_list`)
   * and the component sublist within the BOM revision record to collect all relevant component item IDs.
   *
   * @param {Object} newRecord - The record object containing the BOM revision details.
   *                             Expected to have a field `billofmaterialsrevision` storing the BOM revision ID.
   * @returns {string[]} An array of unique component item IDs. Returns an empty array if no BOM revision ID
   *                     is found or if an error occurs during processing.
   */
  const getComponentItemIdsFromBomRevision = (newRecord) => {
    const ids = new Set();
    try {
      const bomRevisionId = newRecord.getValue("billofmaterialsrevision");
      if (!bomRevisionId) return [];

      const bomRev = record.load({
        type: "bomrevision",
        id: bomRevisionId,
        isDynamic: false,
      });

      // 1) Custom field custrecord_mfgmob_mm_auto_issue_list
      const list =
        bomRev.getValue("custrecord_mfgmob_mm_auto_issue_list") || "";
      if (list) {
        list.split("|").forEach((line) => {
          const [itemId] = line.split(",");
          if (itemId) ids.add(String(itemId));
        });
      }

      // 2) Line items inside BOM Revision > component sublist
      const compCount = bomRev.getLineCount("component");
      for (let i = 0; i < compCount; i++) {
        const itemId = bomRev.getSublistValue({
          sublistId: "component",
          fieldId: "item",
          line: i,
        });
        if (itemId) ids.add(String(itemId));
      }
    } catch (e) {
      log.error("getComponentItemIdsFromBomRevision", e);
    }
    return Array.from(ids);
  };

  /**
   * Creates a map of item labels based on a list of item internal IDs.
   *
   * This function generates a mapping between item internal IDs and their corresponding
   * label, which consists of the item ID and optionally a display name or sales description.
   * If the display name or sales description is available, it is appended to the item ID
   * in the format "itemid : display". If neither is available, only the item ID is used.
   *
   * @param {Array<string|number>} itemIds - An array of internal IDs of items to be processed.
   *                                         If the array is empty or null, an empty map is returned.
   * @returns {Map<string, string>} A map where the keys are item internal IDs (as strings),
   *                                and the values are the corresponding label strings.
   */
  const buildItemLabelMap = (itemIds) => {
    const map = new Map();
    if (!itemIds || !itemIds.length) return map;

    try {
      const s = search.create({
        type: search.Type.ITEM,
        filters: [["internalid", "anyof", itemIds]],
        columns: ["itemid", "displayname", "salesdescription"],
      });

      s.run().each((res) => {
        const id = String(res.id);
        const itemid = res.getValue("itemid");
        const display =
          res.getValue("displayname") || res.getValue("salesdescription") || "";
        map.set(id, display ? `${itemid} : ${display}` : itemid);
        return true;
      });
    } catch (e) {
      log.error("buildItemLabelMap", e);
    }

    return map;
  };

  /**
   * Builds and configures the "Component Lots" sublist for a given form. The sublist is added to a specific tab and contains fields for managing component-related lot information.
   *
   * @param {Object} params - The parameter object for configuring the sublist.
   * @param {Object} params.form - The form object where the sublist will be added.
   * @param {Map<string, string>} params.itemLabelMap - A map of item IDs to their labels, used for populating the "Component Item" field options.
   */
  const buildComponentLotsSublist = ({ form, itemLabelMap }) => {
    const tabId = "custom1810";

    const sublist = form.addSublist({
      id: "custpage_component_lot_sublist",
      label: "Component Lots",
      type: serverWidget.SublistType.INLINEEDITOR,
      tab: tabId,
    });

    const itemField = sublist.addField({
      id: "custpage_item",
      label: "Component Item",
      type: serverWidget.FieldType.SELECT,
    });
    itemField.addSelectOption({ value: "", text: "" });

    itemLabelMap.forEach((label, id) =>
      itemField.addSelectOption({ value: id, text: label }),
    );

    const lotField = sublist.addField({
      id: "custpage_lot_number",
      label: "Lot Number",
      type: serverWidget.FieldType.SELECT,
    });
    lotField.addSelectOption({ value: "", text: "" });

    sublist.addField({
      id: "custpage_expiration_date",
      label: "Expiration Date",
      type: serverWidget.FieldType.DATE,
    });

    sublist.addField({
      id: "custpage_quantity",
      label: "Quantity",
      type: serverWidget.FieldType.FLOAT,
    });

    sublist.addField({
      id: "custpage_location",
      label: "Location",
      type: serverWidget.FieldType.SELECT,
      source: "location",
    });
  };
  /**
   * Injects an INLINEHTML field that hides one or more elements
   * on the client using jQuery + require().
   *
   * @param {Object} options
   * @param {ServerWidgetForm} options.form - Suitelet/UE form
   * @param {string|string[]} options.selectors - CSS selector or array of selectors
   * @param {string} [options.fieldId='custpage_hide_element'] - internal id of inline html field
   */
  const injectHideScript = ({
    form,
    selectors,
    fieldId = "custpage_hide_element",
  }) => {
    const functionName = "injectHideScript";

    try {
      const selArray = Array.isArray(selectors) ? selectors : [selectors];

      const jsCommands = selArray
        .filter(Boolean)
        .map((sel) => `jQuery("${sel}").hide();`)
        .join("");

      if (!jsCommands) return;

      const inlineFld = form.addField({
        id: fieldId,
        label: "not shown - hidden",
        type: serverWidget.FieldType.INLINEHTML,
      });

      inlineFld.defaultValue = `<script>
        jQuery(function($){
          require([], function(){
            ${jsCommands}
          });
        });
      </script>`;
    } catch (e) {
      log.error(functionName, { message: e.message, stack: e.stack });
    }
  };
  /**
   * Defines the `beforeLoad` user event handler for certain record types and performs specific actions based on the event type.
   *
   * The function modifies the record's form, dynamically builds sublists, and assigns a client script when certain conditions are met.
   *
   * @param {Object} ctx - The context object passed into the `beforeLoad` event.
   * @param {Object} ctx.form - Represents the current form in the user event.
   * @param {Object} ctx.newRecord - Represents the record object involved in the current event.
   * @param {string} ctx.type - The context for the user event (e.g., create, edit, delete).
   *
   * @throws Will log an error if removing a sublist fails.
   */
  const beforeLoad = (ctx) => {
    const { form, newRecord, type } = ctx;
    if (type == "create") {
      injectHideScript({
        form,
        selectors: "#recmachcustrecord_cwgp_lottrace_sourcetxlnk",
      });
    }
    if (type === ctx.UserEventType.DELETE) return;
    if (newRecord.type !== record.Type.ASSEMBLY_BUILD) return;

    const itemIds = getComponentItemIdsFromBomRevision(newRecord);
    const itemLabelMap = buildItemLabelMap(itemIds);

    buildComponentLotsSublist({ form, itemLabelMap });

    form.clientScriptModulePath =
      "SuiteScripts/cwgp/client/OLIPOP_CS_AS_CreateLotTBility.js";
  };
  /**
   * ---------------------------------------------------------------------
   *
   * @function afterSubmit
   *
   * @description
   * On Assembly Build CREATE only:
   * - Reads component lots JSON saved by Client Script
   * - Calls Suitelet to create Lot Traceability records
   * - Clears JSON field to prevent rerun
   *
   * ---------------------------------------------------------------------
   */
  const afterSubmit = (scriptContext) => {
    const functionName = "afterSubmit";
    const { newRecord, type } = scriptContext;

    try {
      // CREATE ONLY
      if (type !== "create") return;
      if (newRecord.type !== record.Type.ASSEMBLY_BUILD) return;

      log.audit(functionName, "START");

      const assemblyId = newRecord.id;

      // JSON body field populated by CS on saveRecord
      const componentLotsJson =
        newRecord.getValue("custbody_cwgp_componentlots_json") || "[]";

      let componentLots = [];
      try {
        componentLots = JSON.parse(componentLotsJson) || [];
      } catch (parseError) {
        log.error(functionName, {
          error: "Invalid JSON in custbody_cwgp_componentlots_json",
          componentLotsJson,
          parseError,
        });
        return;
      }

      if (!componentLots.length) {
        log.audit(functionName, "No component lots to process.");
        return;
      }
      const objParams = {
        action: "createLotTraceability",
        dataObj: JSON.stringify({
          assemblyId,
          componentLots: componentLots,
        }),
      };
      let objResponse = https.requestSuitelet({
        scriptId: "customscript_olipop_sl_custom_function",
        deploymentId: "customdeploy_olipop_sl_custom_function",
        body: objParams,
        method: https.Method.POST,
      });

      log.audit(functionName, {
        responseCode: objResponse.code,
        responseBody: (objResponse.body || "").substring(0, 1000),
        assemblyId,
        lineCount: componentLots.length,
      });

      record.submitFields({
        type: record.Type.ASSEMBLY_BUILD,
        id: assemblyId,
        values: {
          custbody_cwgp_componentlots_json: "",
        },
        options: { enableSourcing: false, ignoreMandatoryFields: true },
      });

      log.audit(functionName, "END");
    } catch (error) {
      log.error(functionName, { error: error.message, stack: error.stack });
    }
  };

  return { beforeLoad, afterSubmit };
});
