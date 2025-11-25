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
  const COMPONENT_SUBLIST_ID = "component";

  /**
   * Extract Component Item IDs from the BOM Revision.
   * Source priority:
   * 1) custrecord_mfgmob_mm_auto_issue_list
   * 2) component sublist inside BOM Revision
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

  /** Build map itemId --> label */
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

  /** Build Component Lots Sublist */
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

  /** beforeLoad */
  const beforeLoad = (ctx) => {
    const { form, newRecord, type } = ctx;

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
      if(type !== "create") return
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

      log.audit(functionName, { objResponse });

      // Call suitelet (fire & log response)

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
