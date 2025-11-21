/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @description
 * - When BOM Revision changes → repopulate Component Item dropdown from BOM
 * - When Component Item changes → populate Lot dropdown from customrecord_cwgp_lotnumber
 * - When Lot changes → set Expiration Date from customrecord_cwgp_lotnumber_expirationdate
 */
define(["N/search", "N/log", "N/record"] /**
 * Handles various operations for a client-side script in SuiteScript, involving BOM items, dropdowns, and sublist handling.
 *
 * @param {Object} search - The search module for performing searches in NetSuite.
 * @param {Object} log - The log module for logging messages.
 * @param {Object} record - The record module for record handling in NetSuite.
 *
 * @returns {Object} An object containing a `fieldChanged` function used as a client-side event handler.
 *
 * @function
 * @name fieldChanged
 * @description Handles field change events on a client record. Includes operations such as:
 * 1. Rebuilding item dropdown when the BOM revision changes, based on data from the BOM record.
 * 2. Populating and filtering the lot number dropdown based on the selected item and location.
 * 3. Setting the expiration date and location based on the selected lot number.
 *
 * @example
 * - Automatically rebuilds item dropdown when the BOM revision changes.
 * - Dynamically filters component lot dropdown when an item is selected in a sublist.
 * - Updates expiration date field after selecting a lot number.
 */, (search, log, record) => {
  const SUBLIST_ID = "custpage_component_lot_sublist";
  const ITEM_FID = "custpage_item";
  const LOT_FID = "custpage_lot_number";
  const EXP_FID = "custpage_expiration_date";
  const LOC_FID = "custpage_location";
  const LOT_REC_TYPE = "customrecord_cwgp_lotnumber";
  const LOT_F_NUMBER = "custrecord_cwgp_lotnumber_number";
  const LOT_F_EXPDATE = "custrecord_cwgp_lotnumber_expirationdate";
  const FINISH_GOOD_TYPE_ID = "17";

  /**
   * Clears all options from a select field and inserts a default empty option.
   *
   * This function retrieves all existing options from the specified select field,
   * removes them, and then inserts a blank option with an empty value and text.
   * If an error occurs during the operation, it logs the error details.
   *
   * @param {Object} fld - The select field object to clear options from.
   * @throws Logs any errors encountered during the process.
   */
  const clearSelect = (fld) => {
    try {
      const opts = fld.getSelectOptions();
      if (opts) opts.forEach((o) => fld.removeSelectOption({ value: o.value }));
      fld.insertSelectOption({ value: "", text: "" });
    } catch (e) {
      log.error("clearSelect", e);
    }
  };

  /**
   * Loads and returns a mapping of BOM (Bill of Materials) items based on the provided record.
   *
   * This function retrieves the BOM revision ID and processes its components to construct a mapping
   * of item IDs to their respective display names or descriptions. It also filters items that belong
   * to a specific product group identified by a constant `FINISH_GOOD_TYPE_ID`.
   *
   * @param {Object} currentRecord - The current record object from which BOM-related information is retrieved.
   * @returns {Object} A mapping object where keys are item IDs and values are formatted strings containing the
   *                   item code and display name or description. If no items are found or if an error occurs,
   *                   an empty object is returned.
   */
  const loadBomItems = (currentRecord) => {
    try {
      const bomId = currentRecord.getValue("billofmaterialsrevision");
      if (!bomId) return {};

      const bom = record.load({
        type: "bomrevision",
        id: bomId,
        isDynamic: false,
      });

      const itemIds = new Set();

      const list = bom.getValue("custrecord_mfgmob_mm_auto_issue_list") || "";
      if (list) {
        list.split("|").forEach((line) => {
          const [itemId] = line.split(",");
          if (itemId) itemIds.add(String(itemId));
        });
      }

      const ccount = bom.getLineCount("component");
      for (let i = 0; i < ccount; i++) {
        const id = bom.getSublistValue({
          sublistId: "component",
          fieldId: "item",
          line: i,
        });
        if (id) {
          itemIds.add(String(id));
        }
      }

      if (!itemIds.size) return {};

      const map = {};
      const searchRes = search.create({
        type: search.Type.ITEM,

        filters: [
          ["internalid", "anyof", Array.from(itemIds)],
          "AND",
          ["custitem_atlas_product_group", "anyof", FINISH_GOOD_TYPE_ID],
        ],
        columns: ["itemid", "displayname", "salesdescription"],
      });

      searchRes.run().each((r) => {
        const id = String(r.id);
        const code = r.getValue("itemid");
        const disp =
          r.getValue("displayname") || r.getValue("salesdescription") || "";
        map[id] = disp ? `${code} : ${disp}` : code;
        return true;
      });

      return map;
    } catch (e) {
      log.error("loadBomItems", e);
      return {};
    }
  };

  const LOADING_ID = "rxrs-mini-loader";

  /**
   * Displays a mini loading overlay with a spinner and optional text message.
   *
   * The function creates and appends a full-screen overlay to the DOM. The overlay contains
   * a spinner and a text message indicating a loading state. If an overlay with the same
   * identifier already exists, the function exits to prevent duplication. The function handles
   * possible errors gracefully to avoid disrupting user flow.
   *
   * Key features:
   * - Displays a spinner animation using CSS keyframes.
   * - Allows customization of the loading message through the `text` parameter.
   * - Prevents duplicate overlays by checking for an existing element with the predefined ID.
   */
  const showMiniLoader = (text = "Loading...") => {
    try {
      if (document.getElementById(LOADING_ID)) return;

      const overlay = document.createElement("div");
      overlay.id = LOADING_ID;
      overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255,255,255,0.6);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      color: #333;
    `;

      const box = document.createElement("div");
      box.style.cssText = `
      background: #fff;
      border: 1px solid #ddd;
      padding: 10px 14px;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      display: flex;
      gap: 8px;
      align-items: center;
    `;

      const spinner = document.createElement("div");
      spinner.style.cssText = `
      width: 12px; height: 12px;
      border: 2px solid #bbb;
      border-top-color: #333;
      border-radius: 50%;
      animation: rxrsSpin 0.8s linear infinite;
    `;

      const label = document.createElement("div");
      label.textContent = text;

      box.appendChild(spinner);
      box.appendChild(label);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      // Inject keyframes once
      if (!document.getElementById("rxrs-mini-loader-style")) {
        const style = document.createElement("style");
        style.id = "rxrs-mini-loader-style";
        style.textContent = `
        @keyframes rxrsSpin { from {transform: rotate(0deg);} to {transform: rotate(360deg);} }
      `;
        document.head.appendChild(style);
      }
    } catch (e) {
      // don't break user flow if DOM is restricted
      console.warn("showMiniLoader failed", e);
    }
  };

  /**
   * Removes the mini loader element from the DOM if it exists.
   * This function attempts to find an element with the ID specified by `LOADING_ID`
   * and removes it. If the element is not found or an error occurs during the process,
   * a warning is logged to the console.
   */
  const hideMiniLoader = () => {
    try {
      const el = document.getElementById(LOADING_ID);
      if (el) el.remove();
    } catch (e) {
      console.warn("hideMiniLoader failed", e);
    }
  };
  function isEmpty(stValue) {
    return (
      stValue === "" ||
      stValue == null ||
      false ||
      (stValue.constructor === Array && stValue.length == 0) ||
      (stValue.constructor === Object &&
        (function (v) {
          for (var k in v) return false;
          return true;
        })(stValue))
    );
  }

  /**
   * Removes all lines from a specified sublist in the provided NetSuite currentRecord object.
   *
   * This function iterates through the lines in the sublist from the last line to the first
   * and removes each line. The operation ensures compatibility with NetSuite's requirement
   * to delete lines from bottom to top.
   *
   * @param {Object} params - The parameters required to remove lines.
   * @param {Object} params.currentRecord - The current record object from which lines will be removed.
   * @param {string} params.sublistId - The internal ID of the sublist from which lines will be removed.
   */
  const removeAllLines = ({ currentRecord, sublistId }) => {
    const lineCount = currentRecord.getLineCount({ sublistId });

    // remove from bottom → top (required by NetSuite)
    for (let i = lineCount - 1; i >= 0; i--) {
      currentRecord.removeLine({
        sublistId,
        line: i,
        ignoreRecalc: true,
      });
    }
  };

  /**
   * Handles field changes on the current record in a NetSuite context.
   *
   * This function provides logic to execute specific actions when certain fields
   * in the record or sublist are changed. The primary operations include:
   *
   * 1. When the Bill of Materials Revision (`billofmaterialsrevision`) field changes,
   *    it rebuilds the item dropdown by loading and mapping BOM items.
   * 2. When a Component Item field within the sublist changes, it populates the
   *    Lot dropdown with corresponding lot data from the custom Lot Number record.
   * 3. When the Lot Number field within the sublist changes, it sets the expiration
   *    date and the location fields based on the selected Lot Number record.
   *
   * @param {Object} ctx - The field change context provided by NetSuite.
   * @param {Object} ctx.currentRecord - The current record being edited.
   * @param {string} ctx.fieldId - The internal ID of the field that triggered the change.
   * @param {string} [ctx.subl-=istId] - The internal ID of the sublist (if applicable)
   *                                   where the field change occurred.
   */
  const fieldChanged = (ctx) => {
    const { currentRecord, fieldId, sublistId } = ctx;

    try {
      /**
       * 1) BOM Revision changed → rebuild item dropdown
       */

      const bodyLocation = currentRecord.getValue("location"); // <-- NEW FILTER
      if (fieldId === "billofmaterialsrevision") {
        const bomRevission = currentRecord.getValue("billofmaterialsrevision");
        if (!bomRevission) return;
        removeAllLines({ currentRecord, sublistId: SUBLIST_ID });
        showMiniLoader("Loading Finished Good items...");

        // Let browser paint the loader first
        setTimeout(() => {
          try {
            const itemMap = loadBomItems(currentRecord);

            currentRecord.selectNewLine({ sublistId: SUBLIST_ID });

            const itemField = currentRecord.getCurrentSublistField({
              sublistId: SUBLIST_ID,
              fieldId: ITEM_FID,
            });

            if (itemField) {
              // Clear existing
              clearSelect(itemField);
              // Insert options
              Object.keys(itemMap).forEach((id) => {
                itemField.insertSelectOption({ value: id, text: itemMap[id] });
              });

              setTimeout(() => {
                Object.keys(itemMap).forEach((id) => {
                  if (isEmpty(id)) return;

                  try {
                    currentRecord.selectNewLine({ sublistId: SUBLIST_ID });

                    // set item
                    currentRecord.setCurrentSublistValue({
                      sublistId: SUBLIST_ID,
                      fieldId: ITEM_FID,
                      value: String(id),
                      ignoreFieldChange: false, // allow sourcing
                    });

                    // ✅ confirm item really got set
                    const itemVal = currentRecord.getCurrentSublistValue({
                      sublistId: SUBLIST_ID,
                      fieldId: ITEM_FID,
                    });

                    if (!itemVal) {
                      // item didn’t stick, don’t commit an empty line
                      currentRecord.cancelLine({ sublistId: SUBLIST_ID });
                      return;
                    }

                    currentRecord.commitLine({ sublistId: SUBLIST_ID });
                  } catch (e) {
                    // don’t leave a blank line hanging
                    try {
                      currentRecord.cancelLine({ sublistId: SUBLIST_ID });
                    } catch (_) {}
                    console.log("Failed adding line for item", id, e);
                  }
                });
              }, 500);
            }
          } catch (e) {
            console.error("BOM load failed", e);
            // optional: alert(e.message)
          } finally {
            hideMiniLoader();
          }
        }, 0);
      }

      /**
       * 2) Component Item changed → populate Lot dropdown
       *    using customrecord_cwgp_lotnumber
       */
      if (sublistId === SUBLIST_ID && fieldId === ITEM_FID) {
        const itemId = currentRecord.getCurrentSublistValue({
          sublistId: SUBLIST_ID,
          fieldId: ITEM_FID,
        });

        const lotFld = currentRecord.getCurrentSublistField({
          sublistId: SUBLIST_ID,
          fieldId: LOT_FID,
        });

        clearSelect(lotFld);

        currentRecord.setCurrentSublistValue({
          sublistId: SUBLIST_ID,
          fieldId: EXP_FID,
          value: "",
          ignoreFieldChange: true,
        });

        if (!itemId) return;

        const lotSearch = search.create({
          type: LOT_REC_TYPE,
          filters: [],
          columns: [
            search.createColumn({ name: "internalid" }),
            search.createColumn({ name: LOT_F_NUMBER }),
          ],
        });

        lotSearch.run().each((r) => {
          const lotRecId = r.getValue("internalid");
          const lotNum = r.getValue(LOT_F_NUMBER);

          lotFld.insertSelectOption({
            value: lotRecId,
            text: lotNum,
          });

          return true;
        });

        return;
      }

      /**
       * 3) Lot Number changed → populate expiration
       */
      if (sublistId === SUBLIST_ID && fieldId === LOT_FID) {
        const lotRecId = currentRecord.getCurrentSublistValue({
          sublistId: SUBLIST_ID,
          fieldId: LOT_FID,
        });

        if (!lotRecId) {
          currentRecord.setCurrentSublistValue({
            sublistId: SUBLIST_ID,
            fieldId: EXP_FID,
            value: "",
            ignoreFieldChange: true,
          });
          return;
        }

        const lotData = search.lookupFields({
          type: LOT_REC_TYPE,
          id: lotRecId,
          columns: [LOT_F_EXPDATE],
        });

        const exp = lotData[LOT_F_EXPDATE] || "";

        currentRecord.setCurrentSublistValue({
          sublistId: SUBLIST_ID,
          fieldId: LOC_FID,
          value: bodyLocation,
          ignoreFieldChange: true,
        });
        currentRecord.setCurrentSublistValue({
          sublistId: SUBLIST_ID,
          fieldId: EXP_FID,
          value: new Date(exp),
          ignoreFieldChange: true,
        });

        return;
      }
    } catch (e) {
      log.error("fieldChanged", e);
    }
  };

  return { fieldChanged };
});
