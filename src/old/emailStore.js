import { editorHistory } from "@components/canvasEditor/store";
import { emailEditorHistory } from "@components/canvasEditor/store/canvas/emailEditorHistory";
import { EmailPage } from "@components/canvasEditor/store/canvas/emailPage";
import {
  ANIMATION_ID,
  AnimationSchema,
  DEFAULT_EMAIL_PAGE_DURATION,
  DISPLACEMENT_ADJUSTMENT,
} from "@components/canvasEditor/styleOptions";
import {
  COLUMN_STACKING,
  ELEMENT_TEMPLATE_TYPE,
  EMAIL_VIEW_MODE,
} from "@constants";
import { WEB_SAFE_FONTS } from "@constants/fonts";
import { addPageEditor, getPrimaryLogo } from "@services";
import { handleUpdateTemplateSize } from "@services/templateServices";
import {
  clonePage,
  fullSyncRowsAndColumnsByLinkedId,
  syncElementsByLinkedId,
} from "@utils/emailEditorUtils";
import { convertFontFamily } from "@utils/index";
import { debounce, uniqBy } from "lodash";
import { cloneDeep } from "lodash";
import { action, autorun, makeAutoObservable, runInAction, toJS } from "mobx";
import { v4 as uuidv4 } from "uuid";

const SOCIAL_ICON_WIDTH = 24;
const SOCIAL_ICON_GAP = 16;

export default class EmailStore {
  id = null;
  activePageId = null;
  scale = 1;
  offsetX = 0;
  offsetY = 0;
  totalTime = 0;
  x = 0;
  y = 0;
  sizeTemplate = "";
  clientCreator = false;
  subCategorySizeId = "";
  templateName = "";
  channel = "";
  channelGroup = "";
  templateType = "";
  background;
  custom = {};
  fonts = [];
  pages = [];

  reactions = [];
  rootStore = null;
  editorEventSignal = null;
  preventUpdateThumbnail = false;
  animationAdminConfig = AnimationSchema.adminConfig;

  copiedElements = [];
  editorNode = null;
  storedFonts = [];
  commonConfigs = {};
  zoomTimelineRatio = 1;

  keyframeAnimationFocus = false;

  reduceSnapSensitivity = false;

  isRedoOrUndo = false;
  textSelection = null;
  isPageChanging = false;
  primaryLogo = "";

  uploadingItems = [];
  leaveModalAction = null;
  showConfirmLeaveModal = false;
  displayGuideAndMargin = false;
  marginConfig = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
  guideConfig = {
    columnX: 0,
    columnY: 0,
  };

  constructor(
    {
      id = uuidv4(),
      pages = [],
      activePageId = "",
      scale = 1,
      offsetX = 0,
      offsetY = 0,
      templateName = "",
      sizeTemplate = "",
      subCategorySizeId = "",
      clientCreator = false,
      animationAdminConfig = AnimationSchema.adminConfig,
      isRedoOrUndo = false,
      displayGuideAndMargin = false,
      marginConfig = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
      guideConfig = {
        columnX: 0,
        columnY: 0,
      },
    },
    rootStore
  ) {
    makeAutoObservable(this, {
      setStore: action,
      isRedoOrUndo: false,
    });

    this.id = id;
    this.pages = this.assignPage(pages);
    this.activePageId = activePageId || this.findFirstAvailablePageId();
    this.clientCreator = clientCreator;
    this.subCategorySizeId = subCategorySizeId;

    this.scale = scale;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.templateName = templateName;
    this.sizeTemplate = sizeTemplate;
    this.animationAdminConfig = animationAdminConfig;

    this.rootStore = rootStore;
    this.copiedElements = [];
    this.getPageDefaultConfigs(pages);

    this.rootStore = rootStore;

    this.editorNode = null;
    this.layerNode = null;
    this.stageAttrs = null;

    this.isRedoOrUndo = isRedoOrUndo;
    this.displayGuideAndMargin = displayGuideAndMargin;
    this.marginConfig = marginConfig;
    this.guideConfig = guideConfig;
  }

  debounceSaveGuideMarginConfig = debounce((configs = {}) => {
    handleUpdateTemplateSize({
      id: this.commonConfigs.id,
      templateId: this.commonConfigs.templateId,
      ...configs,
    });
  }, 500);

  setMarginConfig = (configs = {}) => {
    const horizontalMargin =
      configs.horizontal !== undefined
        ? { left: configs.horizontal, right: configs.horizontal }
        : {};

    const verticalMargin =
      configs.vertical !== undefined
        ? { top: configs.vertical, bottom: configs.vertical }
        : {};

    const individualMargins = {};
    if (configs.top !== undefined) individualMargins.top = configs.top;
    if (configs.right !== undefined) individualMargins.right = configs.right;
    if (configs.bottom !== undefined) individualMargins.bottom = configs.bottom;
    if (configs.left !== undefined) individualMargins.left = configs.left;

    const marginConfigs = {
      ...horizontalMargin,
      ...verticalMargin,
      ...individualMargins,
    };

    this.marginConfig = {
      ...this.marginConfig,
      ...marginConfigs,
    };

    if (
      !this.displayGuideAndMargin &&
      (configs.horizontal !== undefined ||
        configs.vertical !== undefined ||
        configs.top !== undefined ||
        configs.right !== undefined ||
        configs.bottom !== undefined ||
        configs.left !== undefined)
    ) {
      this.setDisplayGuideAndMargin(true);
    }
    this.debounceSaveGuideMarginConfig({
      marginConfig: this.marginConfig,
      displayGuideAndMargin: this.displayGuideAndMargin,
    });
  };

  setGuideConfig = (configs = {}) => {
    const guideConfig = {
      ...this.guideConfig,
      ...configs,
    };
    this.guideConfig = guideConfig;
    if (
      !this.displayGuideAndMargin &&
      (guideConfig.columnX || guideConfig.columnY)
    ) {
      this.setDisplayGuideAndMargin(true);
    }

    this.debounceSaveGuideMarginConfig({
      guideConfig,
      displayGuideAndMargin: this.displayGuideAndMargin,
    });
  };

  setDisplayGuideAndMargin = (value = false) => {
    this.displayGuideAndMargin = value;
    this.debounceSaveGuideMarginConfig({
      displayGuideAndMargin: this.displayGuideAndMargin,
    });
  };

  delaySetPageChanging = debounce(async (value = false) => {
    if (value === false) {
      const pages = this.pages || [];
      // Wait for both pages' sync queues to flush before marking as not changing
      await Promise.all(
        pages
          .map(p => p?.syncManager)
          .filter(Boolean)
          .map(sm => sm.waitForIdle())
      );
    }
    this.isPageChanging = value;
  }, 1500);

  setStore = (payload, isOptimize) => {
    const { pages: payloadPages, templateSizeId } = payload;
    const desktopPage = payloadPages?.find(
      page => page.viewMode === EMAIL_VIEW_MODE.DESKTOP && !page.hidePage
    );
    let mobilePage = payloadPages?.find(
      page => page.viewMode === EMAIL_VIEW_MODE.MOBILE && !page.hidePage
    );

    if (!mobilePage) {
      mobilePage = {
        ...cloneDeep(desktopPage || {}),
        id: uuidv4(),
        parentId: desktopPage?.id,
        width: 375,
        viewMode: EMAIL_VIEW_MODE.MOBILE,
        children: [],
        rows: [],
        isDefault: false,
      };
    }

    const pages = [desktopPage, mobilePage].filter(Boolean);

    // Dispose old pages before assigning new ones
    if (this.pages?.length > 0) {
      this.pages.forEach(page => {
        if (page && typeof page.dispose === "function") {
          page.dispose();
        }
      });
    }

    this.pages = this.assignPage(pages);

    const activePage = pages?.find(page => !page.hidePage);
    this.getPageDefaultConfigs(pages);
    this.activePageId = activePage?.id || null;
    const pageId = activePage?.id || uuidv4();
    this.subCategorySizeId = activePage?.subCategoryId;
    this.id = templateSizeId || uuidv4();
    this.scale = activePage?.scale || 1;
    this.templateName = desktopPage?.name || "";
    this.sizeTemplate = activePage?.sizeTemplate || "";
    this.clientCreator = activePage?.clientCreator;

    if (!isOptimize) {
      emailEditorHistory.init(
        this.pages.map(page => page.storeValue),
        pageId
      );
    }
  };

  init = async () => {
    this.reactions = [];
    this.reactions.push(
      autorun(() => {
        this.setTotalTime(this.calculateTotalTime());
      })
    );
    this.primaryLogo = await this.getPrimaryLogo();
    this.pages = this.assignPage(this.pages);
    this.activePageId = this.activePageId || this.findFirstAvailablePageId();
  };

  destroy = () => {
    if (this.reactions?.length > 0) {
      this.reactions.forEach(disposer => disposer()); // Destroy all reaction of class
      this.reactions = [];
    }
    this.reset();
    emailEditorHistory.clear();
  };

  setSelectedElements = (_elements = []) => {
    if (this.activePage) {
      this.activePage?.setSelectedElements(_elements);
    }
  };

  reset = () => {
    // Dispose all pages before resetting
    if (this.pages?.length > 0) {
      this.pages.forEach(page => {
        if (page && typeof page.dispose === "function") {
          page.dispose();
        }
      });
    }
    this.id = null;
    this.pages = [];
    this.children = [];
    this.activePageId = "";
    this.totalTime = 0;
    this.commonConfigs = {
      id: "",
      templateId: "",
      name: "",
      approve: {
        approvalStatus: "",
        approvalBy: "",
        approvalDetail: {
          requestApprovalBy: "",
          approvedBy: null,
          resetBy: null,
          approvalUserIds: [],
        },
      },
    };
    this.scale = 1;
    this.templateName = "";
    this.sizeTemplate = "";
    this.clientCreator = false;
    this.setCopiedElements([]);
    this.subCategorySizeId = "";
    this.keyframeAnimationFocus = false;
    this.editorNode = null;
    this.displayGuideAndMargin = false;
    this.marginConfig = {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    };
    this.guideConfig = {
      columnX: 0,
      columnY: 0,
    };
  };

  findFirstAvailablePageId = () => {
    return this.pages.find(page => !page.hidePage)?.id;
  };

  getPageDefaultConfigs = pages => {
    const pageDefault = this.getPageDefault(pages);
    if (pageDefault) {
      this.displayGuideAndMargin = pageDefault.displayGuideAndMargin;
      this.marginConfig = pageDefault.marginConfig || {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      };
      this.guideConfig = pageDefault.guideConfig || {
        columnX: 0,
        columnY: 0,
      };
      this.commonConfigs = {
        id: pageDefault.id,
        templateId: pageDefault.templateId,
        name: pageDefault?.name || "",
        approve: {
          approvalStatus: pageDefault.approvalStatus || "",
          approvalBy: pageDefault.approvalBy || "",
          approvalDetail: pageDefault.approvalDetail || {
            requestApprovalBy: "",
            approvedBy: null,
            resetBy: null,
            approvalUserIds: [],
          },
        },
      };
    }
    return {};
  };

  assignPage = _data => {
    if (_data?.length > 0) {
      const commonDuration = _data.reduce((max, item) => {
        return Math.max(max, item.duration);
      }, 0);

      const isEmptyTemplate =
        _data.length > 0 &&
        !_data[0]?.rows?.length &&
        !_data[0]?.children?.length;

      _data?.forEach((item, idx) => {
        item.duration = commonDuration || DEFAULT_EMAIL_PAGE_DURATION;
        item.isDefault = !item.parentId;
        const page = new EmailPage({
          ...item,
          isEmptyTemplate,
        });
        page.setPage({
          ...item,
          rows: page.rows || [],
          children: page.children || [],
          ordinalNumber: idx,
        });
        // Dispose of old page instance if it exists
        const oldPage = this.pages.find(page => page.id === item.id);
        if (oldPage && typeof oldPage.dispose === "function") {
          oldPage.dispose();
        }
        this.pages = [...this.pages.filter(page => page.id !== item.id), page];
        if (item?.children?.length > 0) {
          page.children.forEach(element => {
            if (
              element?.type === ELEMENT_TEMPLATE_TYPE.TEXT &&
              element?.s3FilePath
            ) {
              this.addBatchStoredFonts(element.fonts);
            }
          });
        }
        page.syncCanvasHeight();
      });
      return this.pages;
    } else {
      return [];
    }
  };

  addBatchStoredFonts = fonts => {
    this.storedFonts = uniqBy([...this.storedFonts, ...fonts], "fontId");
  };

  setTemplateName = name => {
    this.templateName = name;
  };

  updateEditorStore = updatedRequest => {
    Object.keys(updatedRequest).forEach(key => {
      if ([key] in this) {
        switch (key) {
          default:
            this[key] = updatedRequest[key];
            break;
        }
      }
    });
  };

  getPageById = id => {
    return this.pages.find(page => page.id === id);
  };

  addPage = async (_data, cb) => {
    const response = await addPageEditor({
      ..._data,
      rows: [],
      emailEditorMode: true,
    });
    if (response) {
      const pageData = response.data;
      if (!pageData.children) {
        pageData.children = _data.children || [];
      }

      const page = new EmailPage({
        ...pageData,
        duration: pageData.duration || DEFAULT_EMAIL_PAGE_DURATION,
      });
      editorHistory.addPage(page.storeValue);
      runInAction(() => {
        this.pages.splice(_data.ordinalNumber, 0, page);
        this.setSelectedPage(page.id);
        if (cb) {
          cb(this.calculateStartTimePage(page.id));
        }
      });
      return page;
    }
    return null;
  };

  duplicatePage = async (pageId, _data, cb) => {
    const page = this.getPageById(pageId);
    if (!page) return false;
    const newPageIndex = this.pages.findIndex(page => page.id === pageId) + 1;
    const newPageId = uuidv4();
    const _newPage = await clonePage(page, newPageId);

    const requestData = {
      ..._data,
      duration: page.duration ?? DEFAULT_EMAIL_PAGE_DURATION,
      background: page.background,
      fonts: page.fonts,
      sizeParentId: page.id,
      animations: [],
      ordinalNumber: newPageIndex,
      children: _newPage.children,
      rows: _newPage.rows,
      emailEditorMode: true,
    };

    const response = await addPageEditor(requestData);
    if (response) {
      const newPage = new EmailPage({
        ..._newPage,
        ...response.data,
        height: page.height,
        name: `${page.name}`,
        width: 375,
      });

      emailEditorHistory.addPage(newPage.storeValue);
      runInAction(() => {
        this.pages.splice(newPageIndex, 0, newPage);
        // Sync rows and children to new page
        this.activePage?.listenRowsChange(this.activePage?.pageRows);
        this.activePage?.listenChildrenChange(this.activePage?.childrenToJson);
        if (cb && !newPage?.hidePage) {
          this.setSelectedPage(newPage.id);
          cb(this.calculateStartTimePage(newPage.id));
        }
      });
      return true;
    } else return false;
  };

  updateCommonPageDuration = async duration => {
    if (this.pages.length === 0) return;
    this.pages.forEach(page => {
      page.updateDurationPage(duration);
    });
  };

  setSelectedPage = _pageId => {
    this.activePageId = _pageId;
  };

  resizeTemplateView = viewMode => {
    this.isPageChanging = true;
    this.activePage?.clearSelected();

    if (viewMode === EMAIL_VIEW_MODE.MOBILE) {
      const page = this.pages.find(p => p.viewMode === EMAIL_VIEW_MODE.MOBILE);
      if (page) {
        const desktopPage = this.activePage;
        // Only sync if mobile page is empty and desktop has content
        if (desktopPage?.rows?.length > 0 && page.rows?.length === 0) {
          // Temporarily disable sync on mobile page to prevent reactions
          page.setSyncDisabled(true);
          try {
            this.syncResponsive(this.activePageId, desktopPage.rows, "rows");
            this.syncResponsive(
              this.activePageId,
              desktopPage.children,
              "children"
            );
          } finally {
            page.setSyncDisabled(false);
          }
        }
        this.activePageId = page.id;
      }
    } else {
      const page = this.pages.find(p => p.viewMode !== EMAIL_VIEW_MODE.MOBILE);
      if (page) {
        this.activePageId = page.id;
      }
    }

    this.delaySetPageChanging(false);
  };

  setCommonConfigs = async (configs = {}, savePage = true) => {
    let updatedConfigs = { ...configs };

    if (savePage) {
      const response = await handleUpdateTemplateSize({
        id: this.commonConfigs.id,
        templateId: this.commonConfigs.templateId,
        ...updatedConfigs,
      });
      if (response) {
        const page = this.getPageById(this.commonConfigs.id);
        if (page) {
          page.updatePage({
            ...updatedConfigs,
          });
        }
      }
    }
    this.commonConfigs = {
      ...this.commonConfigs,
      ...updatedConfigs,
    };
  };

  loadedFont = (loadedFont, status) => {
    const isWebFonts =
      !loadedFont.fontId &&
      WEB_SAFE_FONTS.map(font => convertFontFamily(font.name)).includes(
        loadedFont.fontFamily
      );

    if (isWebFonts) {
      if (
        this.storedFonts.some(font => font.fontFamily === loadedFont.fontFamily)
      ) {
        this.storedFonts.forEach(font => {
          if (!font.fontId && font.fontFamily === loadedFont.fontFamily) {
            font.loaded = status;
          }
        });
      } else {
        this.storedFonts.push({ ...loadedFont, loaded: status });
      }
      return;
    }

    if (this.storedFonts.some(font => font.fontId === loadedFont.fontId)) {
      this.storedFonts.forEach(font => {
        if (font.fontFamily === loadedFont.fontFamily) {
          font.loaded = status;
        }
      });
    } else {
      this.storedFonts.push({ ...loadedFont, loaded: status });
    }
  };

  setCopiedElements = elements => {
    this.copiedElements = elements;
  };

  toggleReduceSnapSensitivity = () => {
    this.reduceSnapSensitivity = !this.reduceSnapSensitivity;
  };

  getPageDefault = pages => {
    const listPages = pages || this.pages || [];
    return listPages.find(page => !page.parentId || page.parentId === "") || {};
  };

  getElementById = elementId => {
    if (!elementId) return null;
    const activePage = this.activePage;
    const elements = activePage.children;
    return elements.find(element => element.id === elementId);
  };

  calculateStartTimePage = pageId => {
    if (this.availablePages?.length === 0) return 0;
    let startTime = 0;
    for (let i = 0; i < this.availablePages.length; i++) {
      if (this.availablePages[i].id === pageId) break;
      startTime += this.availablePages[i].duration;
    }
    return +startTime.toFixed(0);
  };

  calculateEndTimePage = pageId => {
    if (this.availablePages?.length === 0) return 0;
    let startTime = 0;
    let indexPage = 0;
    for (let i = 0; i < this.availablePages.length; i++) {
      if (this.availablePages[i].id === pageId) {
        indexPage = i;
        break;
      }
      startTime += this.availablePages[i].duration;
    }
    return +(startTime + this.availablePages[indexPage].duration).toFixed(0);
  };

  setTextSelection(_textSelection) {
    this.textSelection = _textSelection;
  }

  resetTextSelection() {
    this.textSelection = null;
  }

  calculateTotalTime = () => {
    return this.availablePages.reduce((total, page) => {
      return +(total + page.duration).toFixed(0);
    }, 0);
  };

  setTotalTime = duration => {
    this.totalTime = duration;
  };

  syncResponsive = (pageId, data, key) => {
    if (!data || !key || !pageId) {
      return;
    }
    // Prevent sync if pages are being changed or if sync is disabled
    if (this.isPageChanging) {
      return;
    }

    runInAction(() => {
      const currentPage = this.pages.find(p => p.id === pageId);
      const toSyncPage = this.pages.find(p => p.id !== pageId);
      if (!currentPage || !toSyncPage) {
        return;
      }

      // Temporarily disable sync on target page to prevent circular updates
      const wasSyncDisabled = toSyncPage.syncDisabled;
      toSyncPage.setSyncDisabled(true);

      try {
        const syncChildren = (normalSync = true) => {
          const toSyncChildren = toSyncPage.children;
          const currentChildren = toJS(currentPage.children);
          const [newChildren] = syncElementsByLinkedId(
            currentChildren,
            toSyncChildren,
            currentPage,
            toSyncPage,
            normalSync
          );
          toSyncPage.children = toSyncPage.assignChildren(newChildren);
          // Invalidate cache after assigning children
          toSyncPage._invalidateChildrenCache();
          toSyncPage.children.forEach(child => {
            if (!child.groupId && child.type !== ELEMENT_TEMPLATE_TYPE.GROUP) {
              if (child.rotation) {
                toSyncPage.fitRotatedElementInContainer(
                  child,
                  child.x,
                  child.y
                );
              } else {
                toSyncPage.fitElementInContainer(child);
              }
            }
          });
        };
        if (key === "rows") {
          const shouldSyncChildren = data.some(
            row =>
              row.stacking !==
              toSyncPage.rows.find(r => r.id === row.id)?.stacking
          );
          const [newRows] = fullSyncRowsAndColumnsByLinkedId(
            data,
            toSyncPage.rows,
            currentPage,
            toSyncPage
          );

          // Reorder columns for mobile and shift elements by column delta
          if (toSyncPage.viewMode === EMAIL_VIEW_MODE.MOBILE) {
            const oldRowsById = new Map(toSyncPage.rows.map(r => [r.id, r]));
            const socialGroupIds = toSyncPage.children
              .filter(
                el => el.elementType === ELEMENT_TEMPLATE_TYPE.SOCIAL_GROUP
              )
              .map(el => el.id);
            newRows.forEach(newRow => {
              const srcRow = currentPage.getRowById(newRow.id);
              const oldRow = oldRowsById.get(newRow.id);
              const stacking = newRow.stacking || COLUMN_STACKING.LEFT_ON_TOP;
              const isSocialBlock = newRow.rowType === "social-block";
              if (
                !srcRow ||
                !oldRow ||
                stacking === COLUMN_STACKING.KEEP_COLUMNS
              )
                return;

              // Handle social-block column order sync from desktop to mobile
              if (isSocialBlock) {
                this._handleSocialBlockLayoutSync(
                  newRow,
                  srcRow,
                  toSyncPage,
                  "desktop"
                );
                return;
              }

              // Build desired order from desktop x positions
              const desktopOrder = (srcRow.columns || [])
                .slice()
                .sort((a, b) => a.x - b.x)
                .map(c => c.id);
              const desiredOrder =
                stacking === COLUMN_STACKING.RIGHT_ON_TOP
                  ? desktopOrder.slice().reverse()
                  : desktopOrder;

              // Sort columns accordingly
              const colMap = new Map(
                (newRow.columns || []).map(c => [c.id, c])
              );
              const ordered = desiredOrder
                .map(id => colMap.get(id))
                .filter(Boolean);
              const extras = (newRow.columns || []).filter(
                c => !desiredOrder.includes(c.id)
              );
              extras.sort((a, b) => (a.y || 0) - (b.y || 0));
              const finalCols = ordered.concat(extras);

              // Reflow Y for new columns
              let accY = 0;
              finalCols.forEach((col, idx) => {
                col.y = idx === 0 ? 0 : accY;
                col.index = idx;
                col.x = 0;
                accY += col.height;
              });

              // Shift elements by column-only delta (row delta already applied in fullSyncRows)
              const oldColsById = new Map(
                (oldRow.columns || []).map(c => [c.id, c])
              );
              finalCols.forEach(col => {
                const oldCol = oldColsById.get(col.id);
                if (!oldCol) return;
                const deltaColY = (col.y || 0) - (oldCol.y || 0);
                if (!deltaColY) return;
                if (col.subRows) {
                  col.subRows.forEach(subRow => {
                    subRow.columns.forEach(subCol => {
                      toSyncPage.children.forEach(el => {
                        if (
                          el.rowId === subRow.id &&
                          el.colId === subCol.id &&
                          !socialGroupIds.includes(el.groupId)
                        ) {
                          el.y += deltaColY;
                        }
                      });
                    });
                  });
                } else {
                  toSyncPage.children.forEach(el => {
                    if (
                      el.rowId === newRow.id &&
                      el.colId === col.id &&
                      !socialGroupIds.includes(el.groupId)
                    ) {
                      el.y += deltaColY;
                    }
                  });
                }
              });

              newRow.columns = finalCols;
              newRow.height = finalCols.reduce((s, c) => s + c.height, 0);
            });
          } else if (currentPage.viewMode === EMAIL_VIEW_MODE.MOBILE) {
            // Handle sync from mobile to desktop for social-block
            const oldRowsById = new Map(toSyncPage.rows.map(r => [r.id, r]));
            const socialGroupIds = toSyncPage.children
              .filter(
                el => el.elementType === ELEMENT_TEMPLATE_TYPE.SOCIAL_GROUP
              )
              .map(el => el.id);
            newRows.forEach(newRow => {
              const srcRow = currentPage.getRowById(newRow.id);
              const oldRow = oldRowsById.get(newRow.id);
              const isSocialBlock = newRow.rowType === "social-block";

              if (!srcRow || !oldRow) return;

              if (isSocialBlock) {
                this._handleSocialBlockLayoutSync(
                  newRow,
                  srcRow,
                  toSyncPage,
                  "mobile"
                );
                return;
              }

              // Handle regular rows: sync column order from mobile to desktop
              const stacking = newRow.stacking || COLUMN_STACKING.LEFT_ON_TOP;
              if (stacking === COLUMN_STACKING.KEEP_COLUMNS) return;

              // Build desired order from mobile y positions (mobile columns are stacked vertically)
              const mobileOrder = (srcRow.columns || [])
                .slice()
                .sort((a, b) => (a.y || 0) - (b.y || 0))
                .map(c => c.id);
              const desiredOrder =
                stacking === COLUMN_STACKING.RIGHT_ON_TOP
                  ? mobileOrder.slice().reverse()
                  : mobileOrder;

              // Sort columns accordingly for desktop
              const colMap = new Map(
                (newRow.columns || []).map(c => [c.id, c])
              );
              const ordered = desiredOrder
                .map(id => colMap.get(id))
                .filter(Boolean);
              const extras = (newRow.columns || []).filter(
                c => !desiredOrder.includes(c.id)
              );
              const finalCols = ordered.concat(extras);

              // Reflow X positions for desktop columns
              let accX = 0;
              finalCols.forEach((col, idx) => {
                col.x = idx === 0 ? 0 : accX;
                col.index = idx;
                col.y = 0; // Reset y for desktop
                accX += col.width;
              });

              // Shift elements by column delta
              const oldColsById = new Map(
                (oldRow.columns || []).map(c => [c.id, c])
              );
              finalCols.forEach(col => {
                const oldCol = oldColsById.get(col.id);
                if (!oldCol) return;
                const deltaColX = (col.x || 0) - (oldCol.x || 0);
                if (!deltaColX) return;

                if (col.subRows) {
                  col.subRows.forEach(subRow => {
                    subRow.columns.forEach(subCol => {
                      toSyncPage.children.forEach(el => {
                        if (
                          el.rowId === subRow.id &&
                          el.colId === subCol.id &&
                          !socialGroupIds.includes(el.groupId)
                        ) {
                          el.x += deltaColX;
                        }
                      });
                    });
                  });
                } else {
                  toSyncPage.children.forEach(el => {
                    if (
                      el.rowId === newRow.id &&
                      el.colId === col.id &&
                      !socialGroupIds.includes(el.groupId)
                    ) {
                      el.x += deltaColX;
                    }
                  });
                }
              });

              newRow.columns = finalCols;
              newRow.width = finalCols.reduce((s, c) => s + c.width, 0);
            });
          }

          toSyncPage.rows = newRows;
          // Invalidate cache after assigning rows
          toSyncPage._invalidateRowsCache();
          if (shouldSyncChildren) {
            syncChildren(false);
          }
        } else if (key === "children") {
          syncChildren();
        }
        toSyncPage.syncCanvasHeight();
      } finally {
        // Restore sync state
        toSyncPage.setSyncDisabled(wasSyncDisabled);
      }
    });
  };

  deleteElements = ids => {
    if (this.activePage) {
      this.activePage.deleteElements(ids);
    }
  };

  disableSyncMobileElements = () => {
    this.pages.forEach(page => {
      runInAction(() => {
        page.children.forEach(element => {
          if (!element.disableSync) {
            element.updateElement({ disableSync: true });
          }
        });
      });
    });
  };

  currentPageIdActive = currentTime => {
    let endTimePage = 0;
    for (let i = 0; i < this.availablePages.length; i++) {
      endTimePage += this.availablePages[i].duration;
      if (i < this.availablePages.length - 1) {
        if (currentTime < endTimePage) {
          return this.availablePages[i].id;
        }
      } else {
        return this.availablePages[i].id;
      }
    }
    return this.availablePages[0]?.id;
  };

  unSelectedElements = () => {
    if (this.activePage) {
      if (this.keyframeAnimationFocus && this.selectedElement) {
        this.selectedElement.updateMainElement({
          keyframePointIndex: null,
        });
        this.updateEditorStore({ keyframeAnimationFocus: false });
      }
      this.activePage?.clearSelected();
    }
  };

  duplicateElement = () => {
    // TODO: Implement duplicate element for email builder
    this.activePage?.clearHovering();
  };

  get editorTimeLineNodes() {
    return [this.activePage?.editorTimeLineNode];
  }

  get availablePages() {
    return this.pages?.filter(page => !page.hidePage) || [];
  }

  get selectedElementsState() {
    return this.activePage?.children.filter(e =>
      this.activePage?.selectedElements.some(selected => selected.id === e.id)
    );
  }

  get isSelectedLockedElements() {
    return this.selectedElementsState.some(e => !e.listening);
  }

  get isSelectedEditingElements() {
    return this.selectedElementsState.some(
      element =>
        element.editing ||
        (element.getElements && element.getElements()?.some(el => el.editing))
    );
  }

  get selectedElement() {
    return this.getElementById(this.activePage?.selectedElements[0]?.id);
  }

  get selectedElementIds() {
    return this.activePage?.selectedElements.map(e => e.id);
  }

  get width() {
    if (!this.activePage) {
      return 600;
    }
    return this.activePage.width;
  }

  get height() {
    if (!this.activePage) {
      return 450;
    }
    return this.activePage.height;
  }

  get displacementAnimationConfig() {
    return {
      [ANIMATION_ID.RISE]:
        this.animationAdminConfig.custom?.displacement?.[ANIMATION_ID.RISE] ||
        DISPLACEMENT_ADJUSTMENT.DEFAULT,
      [ANIMATION_ID.PAN]:
        this.animationAdminConfig.custom?.displacement?.[ANIMATION_ID.PAN] ||
        DISPLACEMENT_ADJUSTMENT.DEFAULT,
    };
  }

  get storedFontsToJS() {
    return toJS(this.storedFonts);
  }

  get storedUnloadedFontsToJS() {
    const result = this.storedFonts.filter(
      font => !Object.prototype.hasOwnProperty.call(font, "loaded")
    );
    return toJS(result);
  }

  get pageFonts() {
    const flatFonts = uniqBy(
      [
        ...(this.pages
          .flatMap(e => e?.children || [])
          ?.flatMap(page => page?.valueList || [])
          .filter(font => font?.fontFamily !== undefined)
          ?.map(e => ({
            ...e,
            rawFontFamily: e?.fontFamily,
            fontFamily: convertFontFamily(e?.fontFamily, e?.fontId),
          })) || []),
        ...this.pages
          .flatMap(e => (e?.children || []).flatMap(e => e?.fonts || []))
          .filter(font => font !== undefined),
      ],
      "fontFamily"
    );

    return toJS(flatFonts);
  }

  get activePage() {
    let page = this.pages?.find(page => page.id === this.activePageId);
    if (!page) {
      page = new EmailPage({});
    }
    return page;
  }

  get inactivePage() {
    return this.pages?.find(page => page.id !== this.activePageId);
  }

  get viewMode() {
    return this.activePage?.viewMode || EMAIL_VIEW_MODE.DESKTOP;
  }

  getPrimaryLogo = async () => {
    const { data: logoPrimaryDomain } = await getPrimaryLogo();

    if (logoPrimaryDomain?.content?.length > 0) {
      return logoPrimaryDomain?.content[0]?.s3FilePath || "";
    }
    return "";
  };

  addUploadingItem = value => {
    this.uploadingItems = [...this.uploadingItems, value];
  };

  removeUploadingItem = value => {
    this.uploadingItems = this.uploadingItems.filter(item => item !== value);
  };

  clearUploadingItems = () => {
    this.uploadingItems = [];
  };

  preventLeaveModal = (action = () => null) => {
    this.showConfirmLeaveModal = true;
    this.leaveModalAction = action;
  };

  cancelLeaveModal = () => {
    this.showConfirmLeaveModal = false;
    this.leaveModalAction = null;
  };

  confirmLeaveModalAction = () => {
    this.showConfirmLeaveModal = false;
    this.uploadingItems.forEach(() => {});
    this.clearUploadingItems();
    if (this.leaveModalAction) {
      this.leaveModalAction();
    }
  };

  _handleSocialBlockLayoutSync = (newRow, srcRow, toSyncPage, sourceMode) => {
    const sourceOrder = (srcRow.columns || [])
      .slice()
      .sort((a, b) => {
        if (sourceMode === "desktop") {
          return a.x - b.x;
        } else {
          return (a.y || 0) - (b.y || 0);
        }
      })
      .map(c => c.id);

    // Sort columns accordingly for social-block
    const colMap = new Map((newRow.columns || []).map(c => [c.id, c]));
    const ordered = sourceOrder.map(id => colMap.get(id)).filter(Boolean);
    const extras = (newRow.columns || []).filter(
      c => !sourceOrder.includes(c.id)
    );
    const finalCols = ordered.concat(extras);

    // Update social-block layout with new column order
    newRow.columns = finalCols;

    // Recalculate social-block column positions
    this._recalculateSocialBlockPositions(newRow, toSyncPage);
  };

  // Helper method to recalculate social-block column positions
  _recalculateSocialBlockPositions = (newRow, toSyncPage) => {
    const iconColumnWidth = SOCIAL_ICON_WIDTH + SOCIAL_ICON_GAP;
    const totalColumns = newRow.columns.length;
    const iconCount = Math.max(0, totalColumns - 2);
    const totalMiddleWidth = iconCount * iconColumnWidth;
    const sideColumnWidth = (newRow.width - totalMiddleWidth) / 2;

    let currentX = 0;
    newRow.columns.forEach((col, index) => {
      col.x = currentX;
      if (index === 0 || index === totalColumns - 1) {
        col.width = sideColumnWidth;
      } else {
        col.width = iconColumnWidth;
      }
      currentX += col.width;
    });

    // Update children positions - optimized to avoid nested loops
    const childrenByRowCol = new Map();
    toSyncPage.children.forEach(el => {
      const key = `${el.rowId}-${el.colId}`;
      if (!childrenByRowCol.has(key)) {
        childrenByRowCol.set(key, []);
      }
      childrenByRowCol.get(key).push(el);
    });

    newRow.columns.forEach(col => {
      const key = `${newRow.id}-${col.id}`;
      const children = childrenByRowCol.get(key) || [];
      children.forEach(el => {
        el.x = col.x + (col.width - el.width) / 2;
      });
    });
  };
}
