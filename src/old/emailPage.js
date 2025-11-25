import { SyncManager } from "@components/canvasEditor/components/editorEmailCanvas/class/SyncManager";
import { Element, emailStore } from "@components/canvasEditor/store";
import { ElementManager } from "@components/canvasEditor/store/canvas/ElementManager";
import { emailEditorHistory } from "@components/canvasEditor/store/canvas/emailEditorHistory";
import { GroupElementStore } from "@components/canvasEditor/store/canvas/groupElement";
import { RowManager } from "@components/canvasEditor/store/canvas/RowManager";
import { savedComponentsStore } from "@components/canvasEditor/store/editorLeftBar/savedComponentsStore";
import {
  ANIMATION_ANIMATE,
  ANIMATION_ELEMENT_LIST,
  ANIMATION_ID,
  ANIMATIONS_COVER,
  AnimationSchema,
  DEFAULT_COVER_DURATION,
  DEFAULT_DELAY_ANIMATION,
  DEFAULT_EMAIL_PAGE_DURATION,
  TIMELINE_INTERFACE,
} from "@components/canvasEditor/styleOptions";
import {
  BLACK_CODE,
  BUTTON_TYPES,
  COLOR_HEX_CODE,
  COLUMN_STACKING,
  ELEMENT_TEMPLATE_TYPE,
  EMAIL_VIEW_MODE,
  MAX_COLUMN_IN_ROW,
  SOCIAL_GROUP_PADDING,
  SOCIAL_ICON_GAP,
  SOCIAL_ICON_WIDTH,
} from "@constants";
import { updateAnimationPage } from "@services";
import { handleUpdateTemplateSize } from "@services";
import { promiseToastStateStore } from "@states";
import { msToSecond } from "@utils";
import { clearClipboard } from "@utils/clipboardUtils";
import {
  calcRectGroupElements,
  unGroupElementsAttrs,
} from "@utils/editorUtils";
import {
  coverNormalizedCrop,
  moveColumnToIndex,
  moveSubRowToIndex,
  swapColumnsInRow,
} from "@utils/emailBuilder/layout";
import {
  calcWrappingLineElement,
  scaleLineElement,
} from "@utils/emailBuilder/lineElement";
import {
  calcWrappingRotatedElement,
  calcWrappingRotatedElementInContainer,
} from "@utils/emailBuilder/rotatedElement";
import { scaleTextElement } from "@utils/emailBuilder/scaleText";
import { getScaledIconSize } from "@utils/emailBuilder/shapeElement";
import {
  getSocialGroupMinWidth,
  resizeSocialGroupElement,
  scaleSocialGroupElement,
} from "@utils/emailBuilder/socialGroup";
import {
  calTextHeight,
  syncElementByRatio,
} from "@utils/emailBuilder/syncElement";
import {
  getSvgAttributes,
  getTextColorByBgColor,
  syncBackgroundBetweenViews,
  syncBackgroundGradientBetweenViews,
} from "@utils/emailEditorUtils";
import { calCellTopBound } from "@utils/emailPropertyUtils";
import { calcListTypeWidth } from "@utils/helper/textHelper";
import update from "immutability-helper";
import { cloneDeep, debounce, isEqual, uniqBy } from "lodash";
import { action, makeAutoObservable, reaction, runInAction, toJS } from "mobx";
import { v4 as uuidv4 } from "uuid";

export class EmailPage {
  static getDefaultChildren(templateId, pageId, row, logoUrl) {
    const col = row.columns[0];
    const rowId = row.id;
    const colId = col.id;

    let elementId = uuidv4();
    if (logoUrl) {
      const match = logoUrl.match(/\/([a-f0-9]{32,})\.svg$/i);
      if (match) {
        elementId = match[1];
      }
    }

    const id = uuidv4();

    const elementAttrs = {
      id,
      templateId,
      sizeId: pageId,
      elementId,
      type: "svg",
      elementType: "logo",
      src: logoUrl,
      fill: "#000000",
      align: "left",
      width: 100,
      height: 100,
      x: 250,
      y: 0,
      rowId,
      colId,
    };

    return [new Element(elementAttrs)];
  }

  id = "";
  name = "";
  channel = "";
  state = "";
  channelGroup = "";
  sizeTemplate = "";
  templateId = "";
  templateType = "";
  parentId = "";
  children = [];
  fonts = [];
  background = "";
  outerBackground = "";
  backgroundGradient = null;
  bleed = 0;
  animations = [];
  animationConfig = AnimationSchema.pageConfig;
  duration = 0;
  hidePage = false;
  clientCreator = false;
  approvalStatus = "";
  approvalBy = "";
  approvalUserIds = [];
  zoomTimeline = 100;
  ordinalNumber = 0;
  subCategoryId = "";
  categoryId = "";

  custom;
  isDefault = false;
  thumbnail = "";
  readyToRemix = false;

  versionCode = "";

  displayGuideAndMargin = false;
  guideConfig = {
    columnX: 0,
    columnY: 0,
  };
  //top, right, bottom, left
  marginConfig = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };

  pageTimelineNode = {};

  rows = [];

  selectedRowId = null;
  selectedColId = null;
  selectedSubRowId = null;
  selectedSubColId = null;
  selectedElementIds = [];
  selectedElement = null;
  selectedElements = [];

  blockHovering = null;
  contentHovering = null;
  resizingCol = null;
  resizingRow = null; // Track which row is being resized to prevent reactions
  movingRow = null;
  enabledSubRowMover = false;
  pendingPageChange = false;
  isSyncing = false; // Guard to prevent circular sync updates
  syncDisabled = false; // Flag to temporarily disable sync

  viewMode = EMAIL_VIEW_MODE.DESKTOP;
  reactions = [];

  // Cache for computed properties to avoid unnecessary recalculations
  _cachedPageRows = null;
  _cachedChildrenToJson = null;
  _rowsVersion = 0;
  _childrenVersion = 0;

  // Element mapping caches for O(1) lookups instead of O(n) filters
  _elementsByRowId = new Map(); // Map<rowId, Element[]>
  _elementsByColumnId = new Map(); // Map<columnId, Element[]>
  _elementsByRowAndColumn = new Map(); // Map<`${rowId}-${colId}`, Element[]>
  _elementsVersion = 0;

  constructor({
    id = uuidv4(),
    name = "",
    channel = "",
    state = "",
    channelGroup = "",
    sizeTemplate = "",
    templateId = "",
    templateType = "",
    parentId = "",
    subCategoryId = "",
    approvalStatus = "",
    approvalBy = "",
    approvalUserIds = [],
    categoryId = "",
    children = [],
    fonts = [],
    background = "#ffffff",
    outerBackground = "#f1f1f1",
    backgroundGradient = null,
    bleed = 0,
    animations = [],
    animationConfig = AnimationSchema.pageConfig,
    duration = DEFAULT_EMAIL_PAGE_DURATION,
    hidePage = false,
    clientCreator = false,
    zoomTimeline = 100,
    isDefault = false,
    ordinalNumber = 0,
    width = 0,
    height = 450,
    thumbnail = "",
    selectedElements = [],
    versionCode = "",
    custom,
    guideConfig = {
      columnX: 0,
      columnY: 0,
    },
    marginConfig = {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    displayGuideAndMargin = false,
    rows = [],
    viewMode = EMAIL_VIEW_MODE.DESKTOP,
    isEmptyTemplate = false,
  }) {
    makeAutoObservable(this, {
      setPage: action,
    });
    this.id = id;
    this.name = name;
    this.channel = channel;
    this.state = state;
    this.channelGroup = channelGroup;
    this.sizeTemplate = sizeTemplate;
    this.templateId = templateId;
    this.templateType = templateType;
    this.clientCreator = clientCreator;
    this.parentId = parentId;
    this.animations = animations;
    this.fonts = fonts;
    this.background = background;
    this.outerBackground = outerBackground;
    this.backgroundGradient = backgroundGradient;
    this.bleed = bleed;
    this.animationConfig = animationConfig;
    this.duration = duration;
    this.hidePage = hidePage;
    this.zoomTimeline = zoomTimeline;
    this.isDefault = isDefault;
    this.ordinalNumber = ordinalNumber;
    this.thumbnail = thumbnail;
    this.selectedElements = selectedElements;
    this.approvalStatus = approvalStatus;
    this.approvalBy = approvalBy;
    this.approvalUserIds = approvalUserIds;
    this.versionCode = versionCode;
    this.custom = custom;
    this.guideConfig = guideConfig;
    this.marginConfig = marginConfig;
    this.displayGuideAndMargin = displayGuideAndMargin;
    this.width = width;
    this.subCategoryId = subCategoryId;
    this.categoryId = categoryId;
    this.viewMode = viewMode;

    this.syncManager = new SyncManager();
    // Initialize managers for better code organization
    this.rowManager = new RowManager(this);
    this.elementManager = new ElementManager(this);

    if (
      isEmptyTemplate &&
      this.viewMode === EMAIL_VIEW_MODE.DESKTOP &&
      emailStore?.primaryLogo &&
      rows.length === 0 &&
      children.length === 0 &&
      !sizeTemplate
    ) {
      this.addDefaultLogo();
    } else {
      this.rows = this.assignRows(rows);
      this._invalidateRowsCache();
      this.children = this.assignChildren(children);
      this._invalidateChildrenCache(); // This will also rebuild element mappings
      this.height = height;
    }

    // Store reaction disposers for proper cleanup
    // Optimized reactions with better guards to prevent unnecessary triggers

    // 1. Page history tracking (essential - keep separate due to different debounce)
    this.reactions.push(
      reaction(
        () => this.storeValue,
        payload => {
          // Guard: skip if operations are in progress
          if (
            this.resizingCol !== null ||
            this.resizingRow !== null ||
            this.movingRow === true
          ) {
            return;
          }
          this.pendingPageChange = true;
          this.listenPageChange(payload);
        }
      )
    );

    // 2. Combined sync reaction for rows and children (consolidated for efficiency)
    // Watch both but use separate handlers with shared guards
    this.reactions.push(
      reaction(
        () => [this.pageRows, this.childrenToJson],
        ([rowsPayload, childrenPayload]) => {
          // Shared guard check for both sync operations
          if (
            this.resizingCol !== null ||
            this.resizingRow !== null ||
            this.movingRow === true ||
            emailStore.activePageId !== this.id ||
            this.isSyncing ||
            this.syncDisabled ||
            emailStore.isPageChanging
          ) {
            return;
          }
          // Handle rows sync
          const currentRowsJson = JSON.stringify(this.rows);
          const rowsPayloadJson = JSON.stringify(rowsPayload);
          if (currentRowsJson !== rowsPayloadJson) {
            this.listenRowsChange(rowsPayload);
          }
          // Handle children sync
          const currentChildrenJson = JSON.stringify(this.childrenToJson);
          const childrenPayloadJson = JSON.stringify(childrenPayload);
          if (currentChildrenJson !== childrenPayloadJson) {
            this.listenChildrenChange(childrenPayload);
          }
        }
      )
    );

    // 3. Thumbnail update (essential for UI)
    this.reactions.push(
      reaction(
        () => this.propsForThumbnail,
        () => {
          this.setEmitUpdateThumbnail();
        }
      )
    );

    // 4. Timeline sync (essential for animations)
    this.reactions.push(
      reaction(
        () => this.pageTimelineNode,
        (newPageTimeline, oldPageTimeline) => {
          this.syncKeyframeElements(newPageTimeline, oldPageTimeline);
        }
      )
    );

    // 5. Element mapping cache rebuild (essential for performance)
    // Watch children array reference and length to catch all mutations
    this.reactions.push(
      reaction(
        () => [this.children.length, this.children.map(c => c.id).join(",")],
        () => {
          // Debounce to avoid rebuilding on every single change during bulk operations
          if (!this._rebuildMappingTimeout) {
            this._rebuildMappingTimeout = setTimeout(() => {
              this._rebuildElementMappings();
              this._rebuildMappingTimeout = null;
            }, 0);
          }
        }
      )
    );
    // Initial build of element mappings
    this._rebuildElementMappings();
  }

  // Dispose method to clean up reactions and prevent memory leaks
  dispose() {
    if (this.reactions?.length > 0) {
      this.reactions.forEach(disposer => disposer());
      this.reactions = [];
    }
    // Clear caches
    this._cachedPageRows = null;
    this._cachedChildrenToJson = null;
    this._rowsVersion = 0;
    this._childrenVersion = 0;
    // Clear element mappings
    this._elementsByRowId.clear();
    this._elementsByColumnId.clear();
    this._elementsByRowAndColumn.clear();
    this._elementsVersion = 0;
    // Cancel any pending sync operations
    this.isSyncing = false;
    this.syncDisabled = false;
  }

  // Method to temporarily disable sync (useful during bulk operations)
  setSyncDisabled = disabled => {
    this.syncDisabled = disabled;
  };

  listenPageChange = debounce(payload => {
    if (
      this.resizingCol !== null ||
      this.resizingRow !== null ||
      this.movingRow === true
    ) {
      return;
    }
    emailEditorHistory.updateState(payload);
    this.pendingPageChange = false;
  }, 1000);

  listenRowsChange = debounce(payload => {
    if (
      this.resizingCol !== null ||
      this.resizingRow !== null ||
      this.movingRow === true ||
      emailStore.activePageId !== this.id ||
      this.isSyncing ||
      this.syncDisabled ||
      emailStore.isPageChanging
    ) {
      return;
    }
    // Prevent sync if payload hasn't actually changed
    const currentRowsJson = JSON.stringify(this.rows);
    const payloadJson = JSON.stringify(payload);
    if (currentRowsJson === payloadJson) {
      return;
    }
    this.isSyncing = true;
    this.syncManager.enqueue("rows", () => {
      try {
        emailStore.syncResponsive(this.id, payload, "rows");
        if (this.syncChildrenCallback) {
          this.syncChildrenCallback();
          this.syncChildrenCallback = null;
        }
      } finally {
        this.isSyncing = false;
      }
    });
  }, 50);

  listenChildrenChange = debounce(payload => {
    // Guard checks are now done in the reaction, but keep as safety check
    if (
      this.resizingCol !== null ||
      this.resizingRow !== null ||
      this.movingRow === true ||
      emailStore.activePageId !== this.id ||
      emailStore.isPageChanging ||
      this.isSyncing ||
      this.syncDisabled
    ) {
      return;
    }
    // Prevent sync if payload hasn't actually changed
    const currentChildrenJson = JSON.stringify(this.childrenToJson);
    const payloadJson = JSON.stringify(payload);
    if (currentChildrenJson === payloadJson) {
      return;
    }
    this.isSyncing = true;
    this.syncManager.enqueue("children", () => {
      try {
        emailStore.syncResponsive(this.id, payload, "children");
      } finally {
        this.isSyncing = false;
      }
    });
  }, 100);

  clearSelected = () => {
    this.selectedRowId = null;
    this.selectedColId = null;
    this.selectedSubRowId = null;
    this.selectedSubColId = null;
    this.selectedElementIds = [];
    this.selectedElement = null;
    this.selectedElements = [];
  };

  setHovering = values => {
    if (Object.hasOwn(values, "contentHovering")) {
      if (isEqual(this.contentHovering, values.contentHovering)) return;
      this.contentHovering = values.contentHovering;
    } else if (Object.hasOwn(values, "blockHovering")) {
      if (isEqual(this.blockHovering, values.blockHovering)) return;
      this.blockHovering = values.blockHovering;
    }
  };

  clearHovering = () => {
    this.contentHovering = null;
    this.blockHovering = null;
  };

  setSelected = (value, key, clearSelected = true) => {
    // prevent re-render if the same value is set
    if (key !== "selectedElementIds") {
      if (this[key] === value) {
        return;
      }
    } else {
      let newIds = [];
      if (typeof value === "string") {
        newIds = [value];
      } else if (Array.isArray(value)) {
        // This handles both an array of IDs (strings) and an array of element objects
        newIds = value.map(item => (item.id ? item.id : item));
      } else if (value && value.id) {
        newIds = [value.id];
      }

      const currentIds = this.selectedElementIds;
      // If the new and current IDs are the same, and no other selections need to be cleared, we can exit early.
      if (
        currentIds.length === newIds.length &&
        currentIds.every(id => newIds.includes(id)) &&
        !this.selectedRowId &&
        !this.selectedColId
      ) {
        return;
      }
    }

    if (clearSelected) this.clearSelected();
    if (key === "selectedElementIds") {
      if (typeof value === "string") {
        this[key] = [value];
        this.selectedElement = this.children.find(el => el.id === value);
        this.selectedElements = [this.selectedElement];
      } else if (Array.isArray(value)) {
        this[key] = value;
        this.selectedElements = value.map(id => {
          return this.children.find(el => el.id === id);
        });
        this.selectedElement = this.selectedElements[0];
      } else {
        this[key] = [value.id];
        this.selectedElement = value;
        this.selectedElements = [value];
      }
      return;
    }
    this[key] = value;
  };

  setResizingCol = rowId => {
    this.resizingCol = rowId;
  };

  setResizingRow = rowId => {
    this.resizingRow = rowId;
    // Disable sync during row resize to prevent performance issues
    if (rowId) {
      this.setSyncDisabled(true);
    } else {
      this.setSyncDisabled(false);
    }
  };

  setEnableSubRowMover = value => {
    this.enabledSubRowMover = value;
  };

  setPage = updatedRequest => {
    const updatedPageObject = { ...this, ...updatedRequest };
    const {
      id,
      name,
      approvalStatus,
      approvalBy,
      approvalUserIds,
      channel,
      state,
      clientCreator,
      channelGroup,
      sizeTemplate,
      templateId,
      templateType,
      parentId,
      children,
      fonts,
      background,
      outerBackground,
      backgroundGradient,
      bleed,
      duration,
      hidePage,
      zoomTimeline,
      isDefault,
      ordinalNumber,
      thumbnail,
      animationConfig,
      height,
      guideConfig,
      marginConfig,
      displayGuideAndMargin,
      custom,
      subCategoryId,
      categoryId,
      animations,
      rows,
      viewMode,
    } = updatedPageObject;

    this.id = id;
    this.name = name;
    this.channel = channel;
    this.state = state;
    this.clientCreator = clientCreator;
    this.channelGroup = channelGroup;
    this.sizeTemplate = sizeTemplate;
    this.approvalStatus = approvalStatus;
    this.approvalBy = approvalBy;
    this.approvalUserIds = approvalUserIds;
    this.templateId = templateId;
    this.templateType = templateType;
    this.parentId = parentId;
    this.animations = animations || [];
    this.animationConfig =
      Object.keys(animationConfig || {})?.length > 0
        ? animationConfig
        : AnimationSchema.pageConfig;
    this.children = this.assignChildren(children);
    this._invalidateChildrenCache();
    this.fonts = fonts;
    this.background = background;
    this.outerBackground = outerBackground;
    this.backgroundGradient = backgroundGradient
      ? {
        ...backgroundGradient,
        isFill: true,
      }
      : null;
    this.bleed = bleed;
    this.duration = Math.round(duration / 100) * 100;
    this.hidePage = hidePage;
    this.zoomTimeline = zoomTimeline;
    this.isDefault = isDefault;
    this.ordinalNumber = ordinalNumber;
    this.thumbnail = thumbnail;
    this.height = height || 450;
    this.guideConfig = guideConfig;
    this.marginConfig = marginConfig;
    this.displayGuideAndMargin = displayGuideAndMargin;
    this.subCategoryId = subCategoryId;
    this.categoryId = categoryId;
    this.custom = custom;
    this.addVersionCode();
    this.rows = this.assignRows(rows);
    this._invalidateRowsCache();
    this.width =
      this.rows.length > 0 && this.rows[0].width
        ? this.rows[0].width
        : !viewMode || viewMode === EMAIL_VIEW_MODE.DESKTOP
          ? 600
          : 375;
    this.viewMode = viewMode || EMAIL_VIEW_MODE.DESKTOP;

    this.clearSelected();
  };

  // Invalidate cache when rows or children change
  _invalidateRowsCache = () => {
    this._cachedPageRows = null;
    this._rowsVersion = 0;
    this._rowsHash = null;
  };

  _invalidateChildrenCache = () => {
    this._cachedChildrenToJson = null;
    this._childrenVersion = 0;
    this._childrenHash = null;
    // Invalidate element mappings when children change
    this._rebuildElementMappings();
  };

  // Rebuild element mapping caches for fast lookups
  _rebuildElementMappings = () => {
    this._elementsByRowId.clear();
    this._elementsByColumnId.clear();
    this._elementsByRowAndColumn.clear();
    this._elementsVersion++;

    // Build maps for O(1) lookups
    this.children.forEach(element => {
      const { rowId, colId } = element;

      if (rowId) {
        if (!this._elementsByRowId.has(rowId)) {
          this._elementsByRowId.set(rowId, []);
        }
        this._elementsByRowId.get(rowId).push(element);
      }

      if (colId) {
        if (!this._elementsByColumnId.has(colId)) {
          this._elementsByColumnId.set(colId, []);
        }
        this._elementsByColumnId.get(colId).push(element);
      }

      if (rowId && colId) {
        const key = `${rowId}-${colId}`;
        if (!this._elementsByRowAndColumn.has(key)) {
          this._elementsByRowAndColumn.set(key, []);
        }
        this._elementsByRowAndColumn.get(key).push(element);
      }
    });
  };

  // Get elements for a specific row and column (most common use case)
  getElementsByRowAndColumn = (rowId, colId) => {
    if (!rowId || !colId) return [];
    const key = `${rowId}-${colId}`;
    return this._elementsByRowAndColumn.get(key) || [];
  };

  // Get elements for a specific row
  getElementsByRowId = rowId => {
    if (!rowId) return [];
    return this._elementsByRowId.get(rowId) || [];
  };

  // Get elements for a specific column
  getElementsByColumnId = colId => {
    if (!colId) return [];
    return this._elementsByColumnId.get(colId) || [];
  };

  assignRows = rows => {
    this._invalidateRowsCache();
    const _rows = [];
    rows.forEach(row => {
      const hasParent = row.rowId && row.colId;
      if (!hasParent) {
        _rows.push(row);
      } else {
        const parentRow = rows.find(_row => _row.id === row.rowId);
        if (parentRow) {
          parentRow.columns.forEach(col => {
            if (col.id === row.colId) {
              if (!col.subRows) {
                col.subRows = [];
              }
              if (!col.subRows.find(sr => sr.id === row.id)) {
                col.subRows.push(row);
              }
            }
          });
        }
      }
    });
    const sortByIndex = (a, b) => a.index - b.index;
    return _rows
      .sort((a, b) => a.y - b.y)
      .map((row, index) => {
        row.index = index;
        row.columns.sort(sortByIndex);
        row.columns.forEach(col => {
          if (col.subRows) {
            col.subRows.sort(sortByIndex);
            col.subRows.forEach(subRow => {
              subRow.columns.sort(sortByIndex);
            });
          }
        });
        return row;
      })
      .sort(sortByIndex);
  };

  assignAnimationToColumn = elements => {
    if (!elements?.convertToGifs?.length) return;
    this.rows.forEach(row => {
      row.columns.forEach(col => {
        const gifData = elements.convertToGifs.find(
          gif => gif.colId === col.id
        );
        if (gifData) {
          row.gifSrc = gifData.src;
        }
      });
    });
  };

  assignChildren = (_elements = []) => {
    if (_elements.length === 0) return [];

    this._invalidateChildrenCache();
    const children = [];
    const rootElements = _elements.filter(item => !item.groupId);
    let count = 0;

    let enterCount = 0;
    let exitCount = 0;

    rootElements
      .sort((a, b) => a.index - b.index)
      .forEach(item => {
        const oldAnimation = this.animations.find(anm => anm.id === item.id);
        const elementAnimation = {
          ...AnimationSchema.elementConfig,
          ...(item?.elementAnimation || oldAnimation || {}),
          id: item.id,
          elementType: item.elementType || item.type,
          delay: 0,
        };

        if (
          elementAnimation.animationId !== ANIMATION_ID.NONE &&
          elementAnimation.animationId !== ANIMATION_ID.KEYFRAME
        ) {
          if (elementAnimation.animate === ANIMATION_ANIMATE.ENTER) {
            elementAnimation.enterIndex = enterCount++;
          } else if (elementAnimation.animate === ANIMATION_ANIMATE.EXIT) {
            elementAnimation.exitIndex = exitCount++;
          } else if (elementAnimation.animate === ANIMATION_ANIMATE.BOTH) {
            elementAnimation.enterIndex = enterCount++;
            elementAnimation.exitIndex = exitCount++;
          }
        }

        if (item.type === ELEMENT_TEMPLATE_TYPE.GROUP && !item.groupId) {
          const groupIndex =
            item.index !== null ? item.index : count + item.elementIds.length;
          const groupElement = new GroupElementStore({
            ...item,
            id: item.id,
            templateId: this.templateId,
            index: groupIndex,
            pageId: this.id,
          });
          groupElement?.setAnimationElement?.(elementAnimation);
          const groupElements = _elements.filter(
            element => element.groupId === item.id
          );
          const groupChildren = [];
          groupElements.forEach((child, elementIndex) => {
            const element = new Element({
              ...child,
              id: child.id,
              templateId: this.templateId,
              index:
                child.index !== null ? child.index : groupIndex + elementIndex,
            });
            groupChildren.push(element);
          });
          children.push(...groupChildren, groupElement);
          count += groupChildren.length + 1;
        } else {
          const element = new Element({
            ...item,
            id: item.id,
            templateId: this.templateId,
            sizeId: this.id,
            index: item.index !== null ? item.index : count,
          });
          element?.setAnimationElement?.(elementAnimation);
          children.push(element);
          count += 1;
        }
      });

    children
      .sort((a, b) => a.index - b.index)
      .slice()
      .forEach((element, index) => {
        element.updateElement({ index });
      });

    return children;
  };

  updateCanvasHeight(height) {
    this.height = height;
  }

  syncCanvasHeight() {
    const height = this.rows.reduce((acc, row) => acc + row.height, 0);
    this.updateCanvasHeight(height || 450);
  }

  // Rows
  generateRow = (sizes = [100], width = this.width, height = 450) => {
    const id = uuidv4();
    let prevCol = null;
    return {
      id,
      height: this.isMobileView ? height * sizes.length : height,
      width,
      x: 0,
      y: 0,
      background: this.background,
      backgroundGradient: this.backgroundGradient,
      hyperlink: "",
      columns: sizes.map(size => {
        const newCol = this.generateColumn(
          id,
          this.isMobileView ? width : (width * size) / 100,
          prevCol && !this.isMobileView ? prevCol.x + prevCol.width : 0,
          height,
          prevCol && this.isMobileView ? prevCol.y + prevCol.height : 0
        );
        prevCol = newCol;
        return newCol;
      }),
      rowType: "row",
    };
  };

  generateSocialElements = async (icons = [], options = {}) => {
    const { scale = 1 } = options;
    const iconCount = icons.length;

    const svgData = await Promise.all(
      icons.map(async icon => {
        return await getSvgAttributes(icon.src);
      })
    );

    const measured = svgData.map(svgIcon => {
      const { iconWidth, iconHeight } = getScaledIconSize(
        svgIcon,
        SOCIAL_ICON_WIDTH * scale
      );
      return { width: iconWidth, height: iconHeight };
    });
    const maxHeight = measured.reduce((m, s) => Math.max(m, s.height), 0);

    const elements = [];
    let currentX = 0;
    for (let i = 0; i < iconCount; i++) {
      const { width: iconWidth, height: iconHeight } = measured[i];
      const element = new Element({
        id: uuidv4(),
        type: ELEMENT_TEMPLATE_TYPE.SHAPE,
        elementType: ELEMENT_TEMPLATE_TYPE.COMPLEX_SVG,
        x: currentX + (iconWidth > 0 ? 0 : 0),
        y: (maxHeight - iconHeight) / 2,
        width: iconWidth,
        height: iconHeight,
        src: icons[i].src,
        name: icons[i].name,
        fill: icons[i].fill || BLACK_CODE.BLACK_HEX,
        hyperlink: icons[i].url || "",
        templateId: emailStore.id || "",
        sizeId: this.id,
        index: this.children.length + i,
        isNew: true,
      });
      elements.push(element);
      currentX += iconWidth + (i < iconCount - 1 ? SOCIAL_ICON_GAP : 0);
    }

    return elements;
  };

  createSocialGroupElement = socialElements => {
    if (socialElements.length === 0) return null;

    // Compute group width/height based on children with padding
    const contentWidth = socialElements.reduce((sum, el, idx) => {
      return (
        sum + el.width + (idx < socialElements.length - 1 ? SOCIAL_ICON_GAP : 0)
      );
    }, 0);
    const contentHeight = socialElements.reduce(
      (m, el) => Math.max(m, el.height || 0),
      0
    );

    // Add padding to total dimensions
    const totalWidth = contentWidth + SOCIAL_GROUP_PADDING.HORIZONTAL * 2;
    const totalHeight = contentHeight + SOCIAL_GROUP_PADDING.VERTICAL * 2;

    // Reposition children locally with padding offset and vertical centering
    let currentX = SOCIAL_GROUP_PADDING.HORIZONTAL;
    socialElements.forEach((el, idx) => {
      el.x = currentX;
      el.y = SOCIAL_GROUP_PADDING.VERTICAL + (contentHeight - el.height) / 2;
      currentX +=
        el.width + (idx < socialElements.length - 1 ? SOCIAL_ICON_GAP : 0);
    });

    const groupId = uuidv4();
    // Set groupId for all social elements
    socialElements.forEach(element => {
      element.groupId = groupId;
    });

    // Create group element without absolute x/y; will be set when placed
    const groupElement = new GroupElementStore({
      id: groupId,
      elementIds: socialElements.map(el => el.id),
      elementType: ELEMENT_TEMPLATE_TYPE.SOCIAL_GROUP,
      x: 0,
      y: 0,
      width: totalWidth,
      height: totalHeight,
      templateId: emailStore.id || "",
      pageId: this.id,
      index: this.children.length + socialElements.length,
      isNew: true,
    });

    return groupElement;
  };

  generateRowSocialBlock = async (
    icons = [100],
    width = this.width,
    height = 112
  ) => {
    const id = uuidv4();
    const SOCIAL_ICON_WIDTH = 24;
    const SOCIAL_ICON_GAP = 16;
    const iconCount = icons.length;
    const iconColumnWidth = SOCIAL_ICON_WIDTH + SOCIAL_ICON_GAP;
    const totalMiddleWidth = iconCount * iconColumnWidth;
    const sideColumnWidth = (width - totalMiddleWidth) / 2;

    const svgData = await Promise.all(
      icons.map(async icon => {
        return await getSvgAttributes(icon);
      })
    );

    // Build columns: [side, icon, icon, icon, icon, side]
    const columns = [];
    const children = [];

    // First side column
    columns.push(this.generateColumn(id, sideColumnWidth, 0, height, 0));

    // Middle icon columns
    let prevX = sideColumnWidth;
    for (let i = 0; i < iconCount; i++) {
      columns.push(this.generateColumn(id, iconColumnWidth, prevX, height, 0));
      const svgIcon = svgData[i];
      const { iconWidth, iconHeight } = getScaledIconSize(
        svgIcon,
        SOCIAL_ICON_WIDTH
      );

      // Add icon in middle column
      const element = {
        id: uuidv4(),
        type: ELEMENT_TEMPLATE_TYPE.SHAPE,
        // Center the icon horizontally within its column
        x: columns[i + 1].x + (columns[i + 1].width - iconWidth) / 2,
        width: iconWidth,
        height: iconHeight,
        y: (columns[i + 1].height - iconHeight) / 2,
        src: icons[i],
        isDragging: false,
        elementType: ELEMENT_TEMPLATE_TYPE.COMPLEX_SVG,
        templateId: emailStore.id || "",
        sizeId: this.id,
        index: this.children.length,
        rowId: id,
        colId: columns[i + 1].id,
        fill: BLACK_CODE.BLACK_HEX,
      };
      const newElement = new Element(element);
      children.push(newElement);
      prevX += iconColumnWidth;
    }

    // Last side column
    columns.push(this.generateColumn(id, sideColumnWidth, prevX, height, 0));

    this.children.push(...children);
    return {
      id,
      height,
      width,
      x: 0,
      y: 0,
      background: this.background,
      backgroundGradient: this.backgroundGradient,
      columns,
      rowType: "social-block",
    };
  };

  get allowActionOnEditor() {
    return !!this.id;
  }

  addSocialBlock = async (item, isDrop) => {
    const contentHovering = this.contentHovering;
    const { hasElement } = contentHovering || {};
    const hasParent = !!(
      contentHovering &&
      contentHovering.parentRowId &&
      contentHovering.parentColId
    );
    // Generate social elements normally first
    const socialElements = await this.generateSocialElements(item.icons);

    // Create group element for the social elements
    const groupElement = this.createSocialGroupElement(socialElements);

    // When contentHovering is null - create new row and add social group
    if (!contentHovering || !contentHovering.rowId || !contentHovering.colId) {
      const newRow = this.generateRow([100], this.width, 112);

      // Calculate y position for new row at the end of the page
      if (this.rows.length > 0) {
        const lastRow = this.rows[this.rows.length - 1];
        newRow.y = lastRow.y + lastRow.height;
      } else {
        newRow.y = 0;
      }

      this.rows.push(newRow);
      this.reorderRows();

      const firstCol = newRow.columns[0];
      groupElement.rowId = newRow.id;
      groupElement.colId = firstCol.id;
      groupElement.x =
        newRow.x + firstCol.x + (firstCol.width - groupElement.width) / 2;
      groupElement.y =
        newRow.y + firstCol.y + (firstCol.height - groupElement.height) / 2;

      socialElements.forEach(el => {
        el.rowId = groupElement.rowId;
        el.colId = groupElement.colId;
      });
      this.addElements([...socialElements, groupElement]);
      this.setSelectedElements([groupElement]);
      this.fitElementInContainer(groupElement);
      this.syncCanvasHeight();
      return groupElement;
    }

    // Condition: isDrop with contentHovering (add group to empty row/col)
    if (
      isDrop &&
      contentHovering &&
      contentHovering.rowId &&
      contentHovering.colId
    ) {
      // Add group element to existing row/column
      const targetRow = this.getRowById(contentHovering.rowId);
      const targetCol = this.getColumnInfo(
        contentHovering.rowId,
        contentHovering.colId
      );

      if (targetRow && targetCol) {
        // Free-blocks: do not create new row; place at cursor/center of free-blocks
        if (targetRow.rowType === "free-blocks") {
          groupElement.rowId = contentHovering.rowId;
          groupElement.colId = contentHovering.colId;
          // Center within the entire free-block row
          groupElement.x =
            targetRow.x + (targetRow.width - groupElement.width) / 2;
          groupElement.y =
            targetRow.y + (targetRow.height - groupElement.height) / 2;

          // Ensure children carry row/col
          socialElements.forEach(el => {
            el.rowId = groupElement.rowId;
            el.colId = groupElement.colId;
          });
          this.addElements([...socialElements, groupElement]);
          this.setSelectedElements([groupElement]);
          this.syncCanvasHeight();
          return groupElement;
        }
        // Handle top/bottom: create a new row ONLY when hasElement is false
        if (["top", "bottom"].includes(contentHovering?.side) && hasElement) {
          const position = contentHovering.side === "top" ? "above" : "below";
          const newRow = this.addNewRow(position, contentHovering.rowId);
          if (newRow) {
            const firstCol = newRow.columns?.[0];
            if (firstCol) {
              groupElement.rowId = newRow.id;
              groupElement.colId = firstCol.id;
              groupElement.x =
                firstCol.x + (firstCol.width - groupElement.width) / 2;
              groupElement.y =
                newRow.y + (firstCol.height - groupElement.height) / 2;

              socialElements.forEach(el => {
                el.rowId = groupElement.rowId;
                el.colId = groupElement.colId;
              });
              this.addElements([...socialElements, groupElement]);
              this.setSelectedElements([groupElement]);
              this.syncCanvasHeight();
              return groupElement;
            }
          }
        }
        // If side is left/right, create a new column like addElement (only at top-level, not inside subRows)
        if (
          ["left", "right"].includes(contentHovering?.side) &&
          !hasParent &&
          !targetCol.subRows
        ) {
          const isSocialBlock = targetRow.rowType === "social-block";
          const maxColumn = isSocialBlock
            ? MAX_COLUMN_IN_ROW.SOCIAL
            : MAX_COLUMN_IN_ROW.DEFAULT;
          if (targetRow.columns.length === maxColumn) {
            promiseToastStateStore.createToast({
              label: `You can only have ${maxColumn} columns per row`,
            });
            this.clearHovering();
            return null;
          }

          const isKeepColumnStacked =
            targetRow.stacking === COLUMN_STACKING.KEEP_COLUMNS;
          const newWidth =
            !this.isMobileView || isKeepColumnStacked
              ? this.width / (targetRow.columns.length + 1)
              : this.width;
          const newColX =
            contentHovering?.side === "left"
              ? targetCol.x
              : targetCol.x + targetCol.width;
          const newCol = this.generateColumn(targetRow.id, newWidth);
          newCol.height =
            this.isMobileView && !isKeepColumnStacked
              ? targetCol.height
              : targetRow.height;
          newCol.x = this.isMobileView && !isKeepColumnStacked ? 0 : newColX;
          groupElement.rowId = targetRow.id;
          groupElement.colId = newCol.id;
          const colIndex = targetRow.columns.findIndex(
            col => col.id === contentHovering?.colId
          );
          const newColIndex =
            contentHovering?.side === "left" ? colIndex : colIndex + 1;
          targetRow.columns.splice(newColIndex, 0, newCol);

          // Reflow columns and compute group's centered position in new column
          targetRow.columns.forEach((col, index) => {
            if (!this.isMobileView || isKeepColumnStacked) {
              col.x =
                index === 0
                  ? 0
                  : targetRow.columns[index - 1].x +
                  targetRow.columns[index - 1].width;
              col.width = newWidth;
              col.height = targetRow.height;
            } else {
              col.x = 0;
              col.width = this.width;
              col.y =
                index === 0
                  ? 0
                  : targetRow.columns[index - 1].y +
                  targetRow.columns[index - 1].height;
            }
            if (
              groupElement.rowId === targetRow.id &&
              groupElement.colId === col.id
            ) {
              groupElement.x =
                targetRow.x + col.x + (col.width - groupElement.width) / 2;
              groupElement.y =
                targetRow.y + col.y + (col.height - groupElement.height) / 2;
            }
          });

          const subRowIds = new Set();
          targetRow.columns.forEach(col => {
            if (col.subRows) {
              col.subRows.forEach(subRow => {
                subRowIds.add(subRow.id);
              });
            }
          });

          this.children.forEach(el => {
            if (
              el.id !== groupElement.id &&
              (el.rowId === targetRow.id || subRowIds.has(el.rowId))
            ) {
              this.fitElementInContainer(el);
            }
          });

          socialElements.forEach(el => {
            el.rowId = groupElement.rowId;
            el.colId = groupElement.colId;
          });
          this.addElements([...socialElements, groupElement]);
          this.setSelectedElements([groupElement]);
          this.fitElementInContainer(groupElement.id);
          this.syncCanvasHeight();
          return groupElement;
        }

        const existing = this.getElementByRowCol(
          contentHovering.rowId,
          contentHovering.colId
        );
        if (existing && !contentHovering?.hasElement) {
          return null;
        }

        // Place into target; center in row if empty, otherwise center in column
        groupElement.rowId = contentHovering.rowId;
        groupElement.colId = contentHovering.colId;
        if (!contentHovering?.hasElement) {
          // Center within the entire row when the cell is empty
          groupElement.x =
            targetRow.x + (targetRow.width - groupElement.width) / 2;
          groupElement.y =
            targetRow.y + (targetRow.height - groupElement.height) / 2;
        } else {
          // Center within the specific column when there is already an element
          groupElement.x =
            targetCol.x + (targetCol.width - groupElement.width) / 2;
          groupElement.y =
            targetCol.y + (targetCol.height - groupElement.height) / 2;
        }

        socialElements.forEach(el => {
          el.rowId = groupElement.rowId;
          el.colId = groupElement.colId;
        });
        this.children.push(...socialElements, groupElement);
        this.fitElementInContainer(groupElement.id);
        this.setSelectedElements([groupElement]);
        this.syncCanvasHeight();
        return groupElement;
      }
    }

    return groupElement;
  };

  addNewRow = (position, rowId) => {
    const currRowIndex = this.rows.findIndex(e => e.id === rowId);
    const newRow = this.generateRow();
    const updateElement = row => {
      // Update column,elements
      row.columns.forEach(col => {
        if (col.subRows) {
          col.subRows.forEach(subRow => {
            subRow.columns.forEach(subCol => {
              this.children.forEach(el => {
                if (
                  el.rowId === subRow.id &&
                  el.colId === subCol.id &&
                  !el.groupId
                ) {
                  el.y += newRow.height;
                }
              });
            });
          });
        } else {
          this.children.forEach(el => {
            if (el.rowId === row.id && el.colId === col.id && !el.groupId) {
              el.y += newRow.height;
            }
          });
        }
      });
    };
    if (position === "above") {
      // Insert row before current row
      const currentRow = this.rows[currRowIndex];
      newRow.y = currentRow.y;
      this.rows.splice(currRowIndex, 0, newRow);
      for (let i = currRowIndex + 1; i < this.rows.length; i++) {
        const prevRow = this.rows[i - 1];
        this.rows[i].y = prevRow.y + prevRow.height;
        updateElement(this.rows[i]);
      }
    } else {
      newRow.y =
        this.rows.length === 0
          ? 0
          : this.rows[currRowIndex].y + this.rows[currRowIndex].height;
      for (let i = currRowIndex + 1; i < this.rows.length; i++) {
        this.rows[i].y += newRow.height;
        updateElement(this.rows[i]);
      }
      this.rows.splice(currRowIndex + 1, 0, newRow);
    }
    this.setSelected(newRow.id, "selectedRowId");
    this.syncCanvasHeight();
    return this.getRowById(newRow.id);
  };

  getRowIndexById(rowId) {
    let rowIndex = this.rows.findIndex(r => r.id === rowId);
    if (rowIndex === -1) {
      for (const r of this.rows) {
        for (const c of r.columns) {
          if (c.subRows) {
            rowIndex = c.subRows.findIndex(sr => sr.id === rowId);
            if (rowIndex > -1) {
              return rowIndex;
            }
          }
        }
      }
    }
    return rowIndex;
  }
  getHighestLevelRowIndex = rowId => {
    const row = this.getRowById(rowId);
    if (row && row.rowId) {
      return this.getRowIndexById(row.rowId);
    }
    return this.getRowIndexById(rowId);
  };
  getRowByLinkedId(linkedId) {
    let row = this.rows.find(r => r.linkedId === linkedId);
    if (!row) {
      for (const r of this.rows) {
        for (const c of r.columns) {
          if (c.subRows) {
            const subRow = c.subRows.find(sr => sr.linkedId === linkedId);
            if (subRow) {
              return subRow;
            }
          }
        }
      }
    }
    return row;
  }
  getRowById(rowId) {
    let row = this.rows.find(r => r.id === rowId);
    if (!row) {
      for (const r of this.rows) {
        for (const c of r.columns) {
          if (c.subRows) {
            row = c.subRows.find(sr => sr.id === rowId);
            if (row) {
              return row;
            }
          }
        }
      }
    }
    return row;
  }
  updateColumnStacking = (rowId, stacking) => {
    const row = this.getRowById(rowId);
    if (row) {
      if (row.stacking === stacking) return;
      if (this.isMobileView) {
        const desktopPage = emailStore.pages.find(p => p.id !== this.id);
        const desktopRow = desktopPage.getRowById(rowId);
        if (desktopRow) {
          this.movingRow = true;
          desktopRow.prevStacking =
            desktopRow.stacking || COLUMN_STACKING.LEFT_ON_TOP;
          desktopRow.stacking = stacking;
          desktopPage.syncManager.enqueue("rows", () =>
            emailStore.syncResponsive(
              desktopPage.id,
              desktopPage.pageRows,
              "rows"
            )
          );
          setTimeout(() => {
            this.movingRow = false;
          }, 300);
        }
        return;
      } else {
        row.prevStacking = row.stacking || COLUMN_STACKING.LEFT_ON_TOP;
        row.stacking = stacking;
      }
    }
  };

  reorderRows = () => {
    this.rows = this.rows
      .sort((a, b) => a.y - b.y)
      .map((row, index) => ({
        ...row,
        index,
      }));
  };

  resizeRow(rowId, newY, newHeight, ignoreResizeImage = false) {
    // Batch all MobX updates to prevent excessive reactions
    runInAction(() => {
      // Get row index by ID
      const rowIndex = this.getRowIndexById(rowId);
      if (rowIndex >= 0 && rowIndex < this.rows.length) {
        const row = this.rows[rowIndex];
        // Calculate the changed offset
        const changedOffset = newHeight - row.height;
        // Update columns in the row height to fit the new row height
        row.columns.forEach(col => {
          if (
            !this.isMobileView ||
            ["divider", "spacer", "dashed"].includes(row.rowType) ||
            (this.isMobileView &&
              row.stacking === COLUMN_STACKING.KEEP_COLUMNS) ||
            (this.isMobileView && row.rowType === "social-block")
          ) {
            col.height += changedOffset;
          }
          if (col.subRows) {
            const subRowsHeight = col.subRows.reduce(
              (acc, subRow) => acc + subRow.height,
              0
            );
            // Resize subrows to fit the new height while maintaining minimum height
            if (subRowsHeight > newHeight) {
              const MINIMUM_SUBROW_HEIGHT = 10; // Define minimum height
              const totalReduction = subRowsHeight - newHeight;

              // First try to reduce the last subrow's height
              const lastSubRow = col.subRows[col.subRows.length - 1];
              const maxLastSubRowReduction = Math.max(
                0,
                lastSubRow.height - MINIMUM_SUBROW_HEIGHT
              );

              if (maxLastSubRowReduction >= totalReduction) {
                // Last subrow can handle the full reduction
                lastSubRow.height -= totalReduction;
                lastSubRow.columns.forEach(subCol => {
                  subCol.height = lastSubRow.height;

                  // Update elements in this column
                  this.children.forEach(el => {
                    if (el.rowId === lastSubRow.id && el.colId === subCol.id) {
                      const isCtaOrLink =
                        el.elementType === ELEMENT_TEMPLATE_TYPE.CTA ||
                        el.elementType === ELEMENT_TEMPLATE_TYPE.LINK;
                      const isLine =
                        el.elementType === ELEMENT_TEMPLATE_TYPE.LINE ||
                        el.elementType === ELEMENT_TEMPLATE_TYPE.LINE_OUTLINE;
                      const isSocialGroup =
                        el.elementType === ELEMENT_TEMPLATE_TYPE.SOCIAL_GROUP;

                      const elementHeight = isLine
                        ? calcWrappingLineElement(el).height
                        : el.height;

                      if (elementHeight > subCol.height) {
                        const _newHeight = subCol.height;

                        if (isCtaOrLink) {
                          const scaleRatio = _newHeight / el.height;
                          const params = scaleTextElement(el, scaleRatio);
                          el.updateElement(params);
                        } else if (el.type === ELEMENT_TEMPLATE_TYPE.TEXT) {
                          const scaleRatio = (_newHeight - 10) / el.height;
                          const baseY = col.y + lastSubRow.y + row.y;
                          const updatedParams = scaleTextElement(
                            el,
                            scaleRatio
                          );

                          el.updateElement({
                            ...updatedParams,
                            width: el.width,
                            y: baseY + (_newHeight - updatedParams.height) / 2,
                          });
                        } else if (isLine) {
                          this.updateLineElementPosition(
                            el,
                            {
                              x: row.x + col.x + lastSubRow.x,
                              y: row.y + col.y + lastSubRow.y,
                              width: subCol.width,
                              height: subCol.height,
                            },
                            _newHeight / elementHeight
                          );
                        } else if (
                          el.type === ELEMENT_TEMPLATE_TYPE.IMAGE &&
                          (!ignoreResizeImage || changedOffset < 0)
                        ) {
                          this.resizeImageElement(
                            el.rowId,
                            el,
                            _newHeight,
                            changedOffset,
                            ignoreResizeImage
                          );
                        } else if (isSocialGroup) {
                          const scale = _newHeight / el.height;
                          const newElement = scaleSocialGroupElement(
                            el,
                            this.children,
                            scale
                          );
                          if (newElement) {
                            el.updateElement({
                              x: newElement.group.x,
                              y: newElement.group.y,
                              width: newElement.group.width,
                              height: newElement.group.height,
                            });
                            newElement.children.forEach(child => {
                              const childElement = this.getElementById(
                                child.id
                              );
                              childElement.updateElement({
                                x: child.x,
                                y: child.y,
                                width: child.width,
                                height: child.height,
                              });
                            });
                          }
                        } else {
                          el.width = el.width * (_newHeight / el.height);
                          el.height = _newHeight;

                          // Only update position if element overflows container
                          const elementBottom = el.y + el.height;
                          const containerBottom =
                            row.y + col.y + lastSubRow.y + subCol.height;
                          if (elementBottom > containerBottom) {
                            el.y = containerBottom - el.height;
                          }
                        }
                      } else {
                        // check if element is overflowed
                        const elementBottom = el.y + el.height;
                        const containerBottom =
                          row.y + col.y + lastSubRow.y + subCol.height;
                        if (elementBottom > containerBottom) {
                          el.y = containerBottom - el.height;
                        }
                      }
                    }
                  });
                });

                // Make sure all subrow positions are updated
                let currentY = 0;
                col.subRows.forEach(subRow => {
                  subRow.y = currentY;
                  currentY += subRow.height;

                  if (subRow.id !== lastSubRow.id) {
                    subRow.columns.forEach(subCol => {
                      this.children.forEach(el => {
                        if (el.rowId === subRow.id && el.colId === subCol.id) {
                          // Only update position if element overflows container
                          const isLine =
                            el.elementType === ELEMENT_TEMPLATE_TYPE.LINE ||
                            el.elementType ===
                            ELEMENT_TEMPLATE_TYPE.LINE_OUTLINE;

                          if (isLine) {
                            this.updateLineElementPosition(el, {
                              x: row.x + col.x + subRow.x,
                              y: row.y + col.y + subRow.y,
                              width: subCol.width,
                              height: subCol.height,
                            });
                          } else {
                            // Handle non-line elements with simple positioning
                            const elementBottom = el.y + el.height;
                            const containerBottom =
                              row.y + col.y + subRow.y + subCol.height;
                            if (elementBottom > containerBottom) {
                              el.y = containerBottom - el.height;
                            }
                          }
                        }
                      });
                    });
                  }
                });
              } else {
                // Need to reduce multiple subrows to achieve the target height
                let remainingReduction = totalReduction;

                // First reduce the last subrow to minimum if needed
                if (maxLastSubRowReduction > 0) {
                  lastSubRow.height = MINIMUM_SUBROW_HEIGHT;
                  remainingReduction -= maxLastSubRowReduction;

                  lastSubRow.columns.forEach(subCol => {
                    subCol.height = MINIMUM_SUBROW_HEIGHT;
                    // Update elements
                    this.children.forEach(el => {
                      if (
                        el.rowId === lastSubRow.id &&
                        el.colId === subCol.id
                      ) {
                        const isCtaOrLink =
                          el.elementType === ELEMENT_TEMPLATE_TYPE.CTA ||
                          el.elementType === ELEMENT_TEMPLATE_TYPE.LINK;
                        const isLine =
                          el.elementType === ELEMENT_TEMPLATE_TYPE.LINE ||
                          el.elementType === ELEMENT_TEMPLATE_TYPE.LINE_OUTLINE;

                        const elementHeight = isLine
                          ? calcWrappingLineElement(el).height
                          : el.height;

                        if (elementHeight > MINIMUM_SUBROW_HEIGHT) {
                          const _newHeight = MINIMUM_SUBROW_HEIGHT;

                          if (isCtaOrLink) {
                            const scaleRatio = _newHeight / el.height;
                            const params = scaleTextElement(el, scaleRatio);
                            el.updateElement(params);
                          } else if (el.type === ELEMENT_TEMPLATE_TYPE.TEXT) {
                            el.updateElement({
                              width: el.width * (_newHeight / el.height),
                              fontSize: el.fontSize * (_newHeight / el.height),
                              height: _newHeight,
                            });
                          } else if (isLine) {
                            this.updateLineElementPosition(
                              el,
                              {
                                x: row.x + col.x + lastSubRow.x,
                                y: row.y + col.y + lastSubRow.y,
                                width: subCol.width,
                                height: subCol.height,
                              },
                              _newHeight / elementHeight
                            );
                          } else if (
                            el.type === ELEMENT_TEMPLATE_TYPE.IMAGE &&
                            (!ignoreResizeImage || changedOffset < 0)
                          ) {
                            this.resizeImageElement(
                              rowId,
                              el,
                              _newHeight,
                              changedOffset,
                              ignoreResizeImage
                            );
                          } else {
                            el.width = el.width * (_newHeight / el.height);
                            el.height = _newHeight;
                          }
                        }
                      }
                    });
                  });
                }

                // Then try to reduce other subrows from back to front
                if (remainingReduction > 0) {
                  for (
                    let i = col.subRows.length - 2;
                    i >= 0 && remainingReduction > 0;
                    i--
                  ) {
                    const subRow = col.subRows[i];
                    const maxReduction = Math.max(
                      0,
                      subRow.height - MINIMUM_SUBROW_HEIGHT
                    );

                    if (maxReduction > 0) {
                      const actualReduction = Math.min(
                        remainingReduction,
                        maxReduction
                      );
                      subRow.height -= actualReduction;
                      remainingReduction -= actualReduction;

                      subRow.columns.forEach(subCol => {
                        subCol.height = subRow.height;
                        // Update elements
                        this.children.forEach(el => {
                          if (
                            el.rowId === subRow.id &&
                            el.colId === subCol.id
                          ) {
                            const isCtaOrLink =
                              el.elementType === ELEMENT_TEMPLATE_TYPE.CTA ||
                              el.elementType === ELEMENT_TEMPLATE_TYPE.LINK;
                            const isLine =
                              el.elementType === ELEMENT_TEMPLATE_TYPE.LINE ||
                              el.elementType ===
                              ELEMENT_TEMPLATE_TYPE.LINE_OUTLINE;
                            const isSocialGroup =
                              el.elementType ===
                              ELEMENT_TEMPLATE_TYPE.SOCIAL_GROUP;

                            const elementHeight = isLine
                              ? calcWrappingLineElement(el).height
                              : el.height;

                            if (elementHeight > subCol.height) {
                              const _newHeight = subCol.height;

                              if (isCtaOrLink) {
                                const scaleRatio = _newHeight / el.height;
                                const params = scaleTextElement(el, scaleRatio);
                                el.updateElement(params);
                              } else if (
                                el.type === ELEMENT_TEMPLATE_TYPE.TEXT
                              ) {
                                const scaleRatio =
                                  (_newHeight - 10) / el.height;
                                const baseY = col.y + lastSubRow.y + row.y;
                                const updatedParams = scaleTextElement(
                                  el,
                                  scaleRatio
                                );

                                el.updateElement({
                                  ...updatedParams,
                                  width: el.width,
                                  y:
                                    baseY +
                                    (_newHeight - updatedParams.height) / 2,
                                });
                              } else if (isLine) {
                                // Scale and adjust line position
                                this.updateLineElementPosition(
                                  el,
                                  {
                                    x: row.x + col.x + subRow.x,
                                    y: row.y + col.y + subRow.y,
                                    width: subCol.width,
                                    height: subCol.height,
                                  },
                                  _newHeight / elementHeight
                                );
                              } else if (isSocialGroup) {
                                const scale = _newHeight / el.height;
                                const newElement = scaleSocialGroupElement(
                                  el,
                                  this.children,
                                  scale
                                );
                                if (newElement) {
                                  el.updateElement({
                                    x: newElement.group.x,
                                    y: newElement.group.y,
                                    width: newElement.group.width,
                                    height: newElement.group.height,
                                  });
                                  newElement.children.forEach(child => {
                                    const childElement = this.getElementById(
                                      child.id
                                    );
                                    childElement.updateElement({
                                      x: child.x,
                                      y: child.y,
                                      width: child.width,
                                      height: child.height,
                                    });
                                  });
                                }
                              } else {
                                el.height = _newHeight;
                              }
                            }
                          }
                        });
                      });
                    }
                  }
                }

                // Now recalculate all subrow positions
                let currentY = 0;
                col.subRows.forEach(subRow => {
                  subRow.y = currentY;
                  currentY += subRow.height;

                  subRow.columns.forEach(subCol => {
                    this.children.forEach(el => {
                      if (el.rowId === subRow.id && el.colId === subCol.id) {
                        // Only update position if element overflows container
                        const isLine =
                          el.elementType === ELEMENT_TEMPLATE_TYPE.LINE ||
                          el.elementType === ELEMENT_TEMPLATE_TYPE.LINE_OUTLINE;

                        if (isLine) {
                          this.updateLineElementPosition(el, {
                            x: row.x + col.x + subRow.x,
                            y: row.y + col.y + subRow.y,
                            width: subCol.width,
                            height: subCol.height,
                          });
                        } else {
                          // Handle non-line elements with simple positioning
                          const elementBottom = el.y + el.height;
                          const containerBottom =
                            row.y + col.y + subRow.y + subCol.height;
                          if (elementBottom > containerBottom) {
                            el.y = containerBottom - el.height;
                          }
                        }
                      }
                    });
                  });
                });
              }
            }
          }
        });
        if (row.height > newHeight) {
          const socialGroupIds = this.children
            .filter(el => el.elementType === ELEMENT_TEMPLATE_TYPE.SOCIAL_GROUP)
            .map(el => el.id);
          this.children.forEach(el => {
            const isRotatedElement = el.rotation && el.rotation !== 0;
            const isSocialGroup =
              el.elementType === ELEMENT_TEMPLATE_TYPE.SOCIAL_GROUP;
            if (
              el.rowId === rowId &&
              (row.rowType === "divider" ||
                row.rowType === "dashed" ||
                socialGroupIds.includes(el.groupId))
            ) {
              if (el.strokeWidth > newHeight) {
                el.strokeWidth = Math.floor(newHeight);
              }
              return;
            }
            if (
              el.rowId === rowId &&
              !el.groupId &&
              el.elementType !== ELEMENT_TEMPLATE_TYPE.GROUP
            ) {
              let elementHeight = el.height;
              let elementY = el.y;

              const isLine =
                el.elementType === ELEMENT_TEMPLATE_TYPE.LINE ||
                el.elementType === ELEMENT_TEMPLATE_TYPE.LINE_OUTLINE;
              const isRotatedElement = !isLine && el.rotation !== 0;

              if (isRotatedElement && !isLine) {
                const rotatedWrapper = calcWrappingRotatedElement(el, {
                  x: el.x,
                  y: el.y,
                });
                elementHeight = rotatedWrapper.bboxHeight;
                elementY = rotatedWrapper.minY;
              }
              if (isLine) {
                elementHeight = calcWrappingLineElement(el).height;
              }

              if (elementY + elementHeight > newY + newHeight) {
                if (isLine) {
                  const elCol = this.getColumnInfo(el.rowId, el.colId);
                  if (elCol) {
                    this.updateLineElementPosition(
                      el,
                      {
                        x: row.x + elCol.x,
                        y: row.y + elCol.y,
                        width: elCol.width,
                        height: elCol.height,
                      },
                      elementHeight > newHeight
                        ? newHeight / elementHeight
                        : null
                    );
                  }
                } else {
                  if (elementHeight > newHeight) {
                    if (el.type === ELEMENT_TEMPLATE_TYPE.TEXT) {
                      const isCtaOrLink =
                        el.elementType === ELEMENT_TEMPLATE_TYPE.CTA ||
                        el.elementType === ELEMENT_TEMPLATE_TYPE.LINK;
                      const elCol = this.getColumnInfo(el.rowId, el.colId);
                      const scaleRatio = (newHeight - 10) / el.height;
                      const baseY = row.y + elCol.y;
                      const updatedParams = scaleTextElement(el, scaleRatio);

                      el.updateElement({
                        ...updatedParams,
                        width: isCtaOrLink ? updatedParams.width : el.width,
                        y: baseY + (newHeight - updatedParams.height) / 2,
                      });
                    } else {
                      if (isRotatedElement) {
                        const scaleRatio = newHeight / elementHeight;
                        el.width = el.width * scaleRatio;
                        el.height = el.height * scaleRatio;
                        el.y = newY + newHeight - el.height;
                      } else if (isSocialGroup) {
                        const scale = newHeight / el.height;
                        const newElement = scaleSocialGroupElement(
                          el,
                          this.children,
                          scale
                        );
                        if (newElement) {
                          el.updateElement({
                            x: newElement.group.x,
                            y: newY + newHeight - newElement.group.height,
                            width: newElement.group.width,
                            height: newElement.group.height,
                          });
                          newElement.children.forEach(child => {
                            const childElement = this.getElementById(child.id);
                            childElement.updateElement({
                              x: child.x,
                              y: child.y,
                              width: child.width,
                              height: child.height,
                            });
                          });
                        }
                      } else if (
                        el.type === ELEMENT_TEMPLATE_TYPE.IMAGE &&
                        (!ignoreResizeImage || changedOffset < 0)
                      ) {
                        this.resizeImageElement(
                          rowId,
                          el,
                          newHeight,
                          changedOffset,
                          ignoreResizeImage
                        );
                      } else {
                        el.width = el.width * (newHeight / el.height);
                        el.height = newHeight;
                        el.y = newY + newHeight - el.height;
                      }
                    }
                  } else {
                    el.y = newY + newHeight - el.height;
                  }
                }
              } else {
                if (!ignoreResizeImage || changedOffset < 0) {
                  this.resizeImageElement(
                    rowId,
                    el,
                    newHeight,
                    changedOffset,
                    ignoreResizeImage
                  );
                }
              }
            }
            if (
              el.rowId === rowId &&
              (el.elementType === ELEMENT_TEMPLATE_TYPE.GROUP ||
                isRotatedElement)
            ) {
              if (isRotatedElement) {
                this.fitRotatedElementInContainer(el, el.x, el.y, newHeight);
              } else {
                const currentHeight = el.height * el.scaleY;
                if (el.y + currentHeight > newY + newHeight) {
                  if (currentHeight < newHeight) {
                    el.y = newY + newHeight - currentHeight;
                  } else {
                    const scaleRatio = newHeight / currentHeight;
                    el.scaleX = el.scaleX * scaleRatio;
                    el.scaleY = el.scaleY * scaleRatio;
                    el.y = newY + newHeight - el.height * el.scaleY;
                  }
                }
              }
            }
            if (el.rowId === rowId && isSocialGroup) {
              if (el.height > newHeight) {
                const scale = newHeight / el.height;
                const newElement = scaleSocialGroupElement(
                  el,
                  this.children,
                  scale
                );
                if (newElement) {
                  el.updateElement({
                    x: newElement.group.x,
                    y: newElement.group.y,
                    width: newElement.group.width,
                    height: newElement.group.height,
                  });
                  newElement.children.forEach(child => {
                    const childElement = this.getElementById(child.id);
                    childElement.updateElement({
                      x: child.x,
                      y: child.y,
                      width: child.width,
                      height: child.height,
                    });
                  });
                }
              }
            }
          });
        } else {
          this.children.forEach(el => {
            if (
              el.rowId === rowId &&
              !el.groupId &&
              el.elementType !== ELEMENT_TEMPLATE_TYPE.GROUP
            ) {
              if (!ignoreResizeImage || changedOffset < 0) {
                this.resizeImageElement(
                  rowId,
                  el,
                  newHeight,
                  changedOffset,
                  ignoreResizeImage
                );
              }
            }
          });
        }
        // Update the row's position and height
        row.height = newHeight;
        // row.y = newY;
        // Update elements y position in the row
        for (let i = rowIndex + 1; i < this.rows.length; i++) {
          const currentRow = this.rows[i];
          const previousRow = this.rows[i - 1];
          currentRow.y = previousRow.y + previousRow.height;
          // Update position for columns in the row
          currentRow.columns.forEach(col => {
            if (col.subRows) {
              col.subRows.forEach(subRow => {
                // subRow.y += changedOffset;
                subRow.columns.forEach(subCol => {
                  this.children.forEach(el => {
                    if (
                      el.rowId === subRow.id &&
                      el.colId === subCol.id &&
                      !el.groupId
                    ) {
                      el.y += changedOffset;
                    }
                  });
                });
              });
            } else {
              this.children.forEach(el => {
                if (
                  el.rowId === currentRow.id &&
                  el.colId === col.id &&
                  !el.groupId
                ) {
                  el.y += changedOffset;
                }
              });
            }
          });
        }
      }
      this.syncCanvasHeight();
    });
  }

  resizeImageElement = (
    rowId,
    el,
    newHeight,
    changedOffset,
    isIgnoreResizeImage = false
  ) => {
    if (el.type !== ELEMENT_TEMPLATE_TYPE.IMAGE || el.rotation) return;
    const row = this.getRowById(rowId);

    if (row.columns.length) {
      row.columns.forEach(column => {
        const rootY = calCellTopBound(el);
        const top = Math.round(Math.abs(rootY - el.y));
        const bottom = Math.round(
          Math.abs(column.height - changedOffset - top - el.height)
        );

        const isAligned = Math.abs(top - bottom) <= 1 && top <= 60;

        if (isAligned && !isIgnoreResizeImage) {
          el.height = newHeight - top * 2;
          if (el.height < 10) {
            el.height = 10;
            el.y = row.y;
          }
          this.coverNormalizedCropd(el);
        } else if (el.height > newHeight) {
          this.cropImageLockWidth(
            el,
            Math.max(newHeight - Math.min(top, 40), 10)
          );

          this.fitElementInContainer(el);
        } else {
          this.fitElementInContainer(el);
        }
      });
    }
  };

  coverNormalizedCropd = el => {
    const newCropParams = coverNormalizedCrop(
      el.imageWidth,
      el.imageHeight,
      el.width,
      el.height
    );
    Object.assign(el, newCropParams);
  };

  cropImageLockWidth = (el, newHeight) => {
    const newCropParams = {
      height: newHeight,
      cropHeight: el.cropHeight * (newHeight / el.height),
    };
    Object.assign(el, newCropParams);
  };

  resizeSubRow = (rowId, newHeight, ignoreResizeImage = false) => {
    const row = this.getRowById(rowId);
    if (row) {
      const index = this.getRowIndexById(rowId);
      const parentRow = this.getRowById(row.rowId);
      const parentColumn = this.getColumnInfo(row.rowId, row.colId);
      row.height = newHeight;
      row.columns.forEach(column => {
        const changedOffset = newHeight - column.height;
        column.height = newHeight;
        if (parentColumn?.subRows) {
          this.children.forEach(el => {
            // Update element in resizing row
            if (el.rowId === rowId && el.colId === column.id) {
              const isLine =
                el.elementType === ELEMENT_TEMPLATE_TYPE.LINE ||
                el.elementType === ELEMENT_TEMPLATE_TYPE.LINE_OUTLINE;
              if (isLine) {
                const lineWrapper = calcWrappingLineElement(el);
                this.updateLineElementPosition(
                  el,
                  {
                    x: row.x + column.x,
                    y: row.y + column.y,
                    width: column.width,
                    height: column.height,
                  },
                  newHeight < lineWrapper.height
                    ? newHeight / lineWrapper.height
                    : null
                );
              } else if (
                el.type === ELEMENT_TEMPLATE_TYPE.TEXT &&
                newHeight < el.height
              ) {
                const isCtaOrLink =
                  el.elementType === ELEMENT_TEMPLATE_TYPE.CTA ||
                  el.elementType === ELEMENT_TEMPLATE_TYPE.LINK;
                const scaleRatio = (newHeight - 10) / el.height;
                const baseY = column.y + parentColumn.y + parentRow.y + row.y;
                const updatedParams = scaleTextElement(el, scaleRatio);

                el.updateElement({
                  ...updatedParams,
                  width: isCtaOrLink ? updatedParams.width : el.width,
                  y: baseY + (newHeight - updatedParams.height) / 2,
                });
              } else if (
                el.type === ELEMENT_TEMPLATE_TYPE.IMAGE &&
                (!ignoreResizeImage || changedOffset < 0)
              ) {
                this.resizeImageElement(
                  rowId,
                  el,
                  newHeight,
                  changedOffset,
                  ignoreResizeImage
                );
              } else {
                this.fitElementInContainer(el);
              }
            }
          });
          for (let i = index + 1; i < parentColumn.subRows.length; i++) {
            const currentRow = parentColumn.subRows[i];
            const previousRow = parentColumn.subRows[i - 1];
            // todo: review this logic, if don't need let remove it.
            currentRow.columns.forEach(subCol => {
              this.children.forEach(el => {
                // Update element in below sub rows
                if (el.colId === subCol.id && el.rowId === currentRow.id) {
                  const elementOffset = el.y - parentRow.y - currentRow.y;
                  el.y =
                    parentRow.y +
                    previousRow.y +
                    previousRow.height +
                    elementOffset;
                  if (el.height > currentRow.height) {
                    const _newHeight = currentRow.height;
                    const isCtaOrLink =
                      el.elementType === ELEMENT_TEMPLATE_TYPE.CTA ||
                      el.elementType === ELEMENT_TEMPLATE_TYPE.LINK;

                    if (isCtaOrLink) {
                      const scaleRatio = _newHeight / el.height;
                      const params = scaleTextElement(el, scaleRatio);
                      el.updateElement(params);
                    } else if (el.type === ELEMENT_TEMPLATE_TYPE.TEXT) {
                      const scaleRatio = (_newHeight - 10) / el.height;
                      const baseY =
                        column.y + parentColumn.y + parentRow.y + row.y;
                      const updatedParams = scaleTextElement(el, scaleRatio);

                      el.updateElement({
                        ...updatedParams,
                        width: el.width,
                        y: baseY + (newHeight - updatedParams.height) / 2,
                      });
                    } else if (
                      el.elementType === ELEMENT_TEMPLATE_TYPE.SOCIAL_GROUP
                    ) {
                      const scaleRatio = _newHeight / el.height;
                      const { element, children } = scaleSocialGroupElement(
                        el,
                        this.children,
                        scaleRatio
                      );
                      el.updateElement({
                        x: element.x,
                        y: element.y,
                        width: element.width,
                        height: element.height,
                      });
                      children.forEach(child => {
                        const childElement = this.getElementById(child.id);
                        childElement.updateElement({
                          x: child.x,
                          y: child.y,
                          width: child.width,
                          height: child.height,
                        });
                      });
                    } else {
                      el.width = el.width * (_newHeight / el.height);
                      el.height = _newHeight;
                    }
                  }
                }
              });
            });
            currentRow.y = previousRow.y + previousRow.height;
          }
        }
      });
      const subRowsHeight = parentColumn.subRows.reduce(
        (acc, subRow) => acc + subRow.height,
        0
      );
      if (
        this.isMobileView &&
        parentRow.stacking !== COLUMN_STACKING.KEEP_COLUMNS
      ) {
        if (subRowsHeight > parentColumn.height) {
          parentColumn.height = subRowsHeight;
          const colIndex = parentRow.columns.findIndex(
            col => col.id === parentColumn.id
          );
          if (colIndex > -1) {
            for (let i = colIndex + 1; i < parentRow.columns.length; i++) {
              const nextCol = parentRow.columns[i];
              const prevCol = parentRow.columns[i - 1];
              const newY = prevCol.y + prevCol.height;
              const offset = newY - nextCol.y;
              nextCol.y = newY;
              if (nextCol.subRows) {
                nextCol.subRows.forEach(subRow => {
                  subRow.columns.forEach(subCol => {
                    this.children.forEach(el => {
                      if (el.rowId === subRow.id && el.colId === subCol.id) {
                        el.y += offset;
                      }
                    });
                  });
                });
              } else {
                this.children.forEach(el => {
                  if (el.rowId === parentRow.id && el.colId === nextCol.id) {
                    el.y += offset;
                  }
                });
              }
            }
          }
        } else if (subRowsHeight < parentColumn.height) {
          this.setSelected(parentRow.id, "selectedRowId", false);
          this.setSelected(parentColumn.id, "selectedColId", false);
          this.resizeColumnHeight(subRowsHeight);
          this.clearSelected();
        }
        const colsHeight = parentRow.columns.reduce((acc, col) => {
          return acc + col.height;
        }, 0);

        if (colsHeight !== parentRow.height) {
          this.resizeRow(parentRow.id, parentRow.y, colsHeight);
        }
      } else {
        if (subRowsHeight > parentRow.height) {
          this.resizeRow(parentRow.id, parentRow.y, subRowsHeight);
        }
      }
    }
  };

  duplicateRow = () => {
    if (this.selectedRowId) {
      const rowIndex = this.getRowIndexById(this.selectedRowId);
      if (rowIndex > -1) {
        // PageA
        const row = this.rows[rowIndex];
        const newRow = {
          ...cloneDeep(row),
          id: uuidv4(),
          y: row.y + row.height,
        };
        // PageB
        // const pageB = emailStore.pages.find(page => page.id !== this.id);
        // let rowB = pageB?.rows[rowIndex] || {};
        // const newRowB = {
        //   ...cloneDeep(rowB),
        //   id: newRow.id,
        //   y: rowB?.y + rowB?.height,
        // };
        // Clone columns
        newRow.columns.forEach(col => {
          // PageA
          const newColId = uuidv4();
          // const colB = newRowB?.columns.find(c => c.id === col.id) || {};
          if (col.subRows) {
            col.subRows.forEach((subRow, srIndex) => {
              // PageA
              const newSubRowId = uuidv4();
              // const subRowB = colB?.subRows[srIndex] || {};
              subRow.columns.forEach((subCol, scIndex) => {
                // PageA
                const newSubColId = uuidv4();
                // const subColB = subRowB?.columns[scIndex] || {};
                // Clone children PageA
                this.children.forEach(el => {
                  if (el.rowId === subRow.id && el.colId === subCol.id) {
                    const elementOffset = el.y - row.y;
                    const newElementId = uuidv4();
                    const newElement = {
                      id: newElementId,
                      index: this.children.length,
                      rowId: newSubRowId,
                      colId: newSubColId,
                      y: newRow.y + elementOffset,
                      templateId: emailStore?.id || "",
                      sizeId: this.id,
                    };
                    this.children.push(
                      new Element({
                        ...el,
                        ...newElement,
                      })
                    );
                    // Clone PageB Child
                    // const pageBChild = pageB?.children.find(
                    //   bEl => bEl.id === el.id
                    // );
                    // if (pageBChild) {
                    //   const elementOffset = pageBChild.y - rowB?.y;
                    //   const newElement = {
                    //     id: newElementId,
                    //     index: pageB?.children.length,
                    //     rowId: newSubRowId,
                    //     colId: newSubColId,
                    //     y: newRowB?.y + elementOffset,
                    //     templateId: emailStore?.id || "",
                    //     sizeId: pageB?.id,
                    //   };
                    //   pageB?.children.push(
                    //     new Element({
                    //       ...pageBChild,
                    //       ...newElement,
                    //     })
                    //   );
                    // }
                  }
                });
                // Assign id for PageA
                subCol.id = newSubColId;
                subCol.rowId = newSubRowId;
                // Assign id for PageB
                // subColB.id = newSubColId;
                // subColB.rowId = newSubRowId;
              });
              // Assign id for PageA
              subRow.id = newSubRowId;
              subRow.colId = newColId;
              subRow.rowId = newRow.id;
              // Assign id for PageB
              // subRowB.id = newSubRowId;
              // subRowB.colId = newColId;
              // subRowB.rowId = newRow.id;
            });
          } else {
            this.children.forEach(el => {
              if (el.groupId) return;
              if (el.rowId === row.id && el.colId === col.id) {
                if (el.type === ELEMENT_TEMPLATE_TYPE.GROUP) {
                  const newGroupId = uuidv4();
                  const groupElementIds = [];
                  const groupChildren = el.getElements();

                  // Clone group children first with relative positioning
                  groupChildren.forEach(groupChild => {
                    const newGroupChildId = uuidv4();
                    const newGroupChild = {
                      id: newGroupChildId,
                      index: this.children.length,
                      rowId: newRow.id,
                      colId: newColId,
                      x: groupChild.x, // Keep relative x position within group
                      y: groupChild.y, // Keep relative y position within group
                      templateId: emailStore?.id || "",
                      sizeId: this.id,
                      groupId: newGroupId,
                    };
                    groupElementIds.push(newGroupChildId);

                    this.children.push(
                      new Element({
                        ...groupChild,
                        ...newGroupChild,
                      })
                    );
                  });

                  const elementOffset = el.y - row.y;
                  const newGroupElement = {
                    id: newGroupId,
                    index: this.children.length,
                    rowId: newRow.id,
                    colId: newColId,
                    y: newRow.y + elementOffset,
                    templateId: emailStore?.id || "",
                    sizeId: this.id,
                    elementIds: groupElementIds,
                  };
                  // Create the group element with calculated position
                  this.children.push(
                    new GroupElementStore({
                      ...el,
                      ...newGroupElement,
                    })
                  );
                } else {
                  const elementOffset = el.y - row.y;
                  const newElementId = uuidv4();
                  const newElement = {
                    id: newElementId,
                    index: this.children.length,
                    rowId: newRow.id,
                    colId: newColId,
                    y: newRow.y + elementOffset,
                    templateId: emailStore?.id || "",
                    sizeId: this.id,
                  };
                  this.children.push(
                    new Element({
                      ...el,
                      ...newElement,
                    })
                  );
                }
                // Clone PageB Child
                // const pageBChild = pageB?.children.find(
                //   bEl => bEl.id === el.id
                // );
                // if (pageBChild) {
                //   const elementOffset = pageBChild.y - rowB?.y;
                //   const newElementB = {
                //     id: newElementId,
                //     index: pageB?.children.length,
                //     rowId: newRowB.id,
                //     colId: newColId,
                //     y: newRowB?.y + elementOffset,
                //     templateId: emailStore?.id || "",
                //     sizeId: pageB?.id,
                //   };
                //   pageB?.children.push(
                //     new Element({
                //       ...pageBChild,
                //       ...newElementB,
                //     })
                //   );
                // }
              }
            });
          }
          // Assign id for PageA
          col.id = newColId;
          col.rowId = newRow.id;
          // Assign id for PageB
          // colB.id = newColId;
          // colB.rowId = newRow.id;
        });
        // Add to rows
        this.rows.splice(rowIndex + 1, 0, newRow);
        // Add to rows PageB
        // pageB?.rows.splice(rowIndex + 1, 0, newRowB);
        for (let i = rowIndex + 2; i < this.rows.length; i++) {
          const newRowY = this.rows[i - 1].y + this.rows[i - 1].height;
          // const newRowBY = pageB?.rows[i - 1]?.y + pageB?.rows[i - 1].height;
          this.rows[i].columns.forEach((col, colIndex) => {
            // const colB = pageB?.rows[i]?.columns[colIndex] || {};
            if (col.subRows) {
              col.subRows.forEach((subRow, srIndex) => {
                // const subRowB = colB?.subRows[srIndex] || {};
                subRow.columns.forEach((subCol, scIndex) => {
                  // const subColB = subRowB?.columns[scIndex] || {};
                  // Update pageA children y position
                  this.children.forEach(el => {
                    if (el.rowId === subRow.id && el.colId === subCol.id) {
                      const elementOffset = el.y - this.rows[i].y;
                      el.y = newRowY + elementOffset;
                    }
                  });
                  // Update pageB children y position
                  // pageB?.children.forEach(el => {
                  //   if (el.rowId === subRowB.id && el.colId === subColB.id) {
                  //     const elementOffset = el.y - pageB?.rows[i].y;
                  //     el.y = newRowBY + elementOffset;
                  //   }
                  // });
                });
              });
            } else {
              // Update pageA children y position
              this.children.forEach(el => {
                if (el.rowId === this.rows[i].id && el.colId === col.id) {
                  if (el.groupId) {
                    return;
                  }
                  const elementOffset = el.y - this.rows[i].y;
                  el.y = newRowY + elementOffset;
                }
              });

              // Update pageB children y position
              // pageB?.children.forEach(el => {
              //   if (el.rowId === pageB?.rows[i].id && el.colId === colB.id) {
              //     const elementOffset = el.y - pageB.rows[i].y;
              //     el.y = newRowBY + elementOffset;
              //   }
              // });
            }
          });
          // Update pageA row Y position
          this.rows[i].y = newRowY;
          // Update pageB row Y position
          // pageB.rows[i].y = newRowBY;
        }
        this.reorderRows();
        this.syncCanvasHeight();
        // pageB?.syncCanvasHeight();
        this.setSelected(newRow.id, "selectedRowId");
      }
    }
  };

  cutRow = () => {
    if (this.selectedRowId) {
      const rowIndex = this.getRowIndexById(this.selectedRowId);
      if (rowIndex > -1) {
        const row = this.rows[rowIndex];
        const rowElements = this.children.filter(element => {
          if (element.rowId === row.id) {
            return true;
          }
          if (row.columns) {
            return row.columns.some(col => {
              if (col.subRows) {
                return col.subRows.some(subRow => element.rowId === subRow.id);
              }
              return false;
            });
          }
          return false;
        });
        const rowData = {
          ...cloneDeep(row),
          pageId: this.id,
          elements: rowElements.map(element => ({
            ...element.toJson,
            pageId: this.id,
          })),
        };
        this.deleteRow();
        return rowData;
      }
    }
    return null;
  };

  pasteRow = async (rowData, onSuccess = () => { }) => {
    const dataToPaste = rowData;
    if (!dataToPaste) {
      return;
    }

    const newRow = {
      ...cloneDeep(dataToPaste),
      id: uuidv4(),
    };

    let insertIndex;
    let insertY;

    if (this.selectedRowId) {
      const selectedRowIndex = this.getRowIndexById(this.selectedRowId);
      insertIndex = selectedRowIndex + 1;
      insertY =
        this.rows[selectedRowIndex].y + this.rows[selectedRowIndex].height;
    } else {
      insertIndex = this.rows.length;
      insertY =
        this.rows.length > 0
          ? this.rows[this.rows.length - 1].y +
          this.rows[this.rows.length - 1].height
          : 0;
    }

    newRow.y = insertY;

    const idMapping = {
      row: { [dataToPaste.id]: newRow.id },
      columns: {},
      subRows: {},
      subColumns: {},
    };
    newRow.columns.forEach(col => {
      const newColId = uuidv4();
      idMapping.columns[col.id] = newColId;

      if (col.subRows) {
        col.subRows.forEach(subRow => {
          const newSubRowId = uuidv4();
          idMapping.subRows[subRow.id] = newSubRowId;
          subRow.columns.forEach(subCol => {
            const newSubColId = uuidv4();
            idMapping.subColumns[subCol.id] = newSubColId;

            subCol.id = newSubColId;
            subCol.rowId = newSubRowId;
          });

          subRow.id = newSubRowId;
          subRow.colId = newColId;
          subRow.rowId = newRow.id;
        });
      }

      col.id = newColId;
      col.rowId = newRow.id;
    });

    dataToPaste.elements?.forEach(elementData => {
      const newElementId = uuidv4();
      const elementOffset = elementData.y - dataToPaste.y;
      const newY = newRow.y + elementOffset;

      let newRowId = newRow.id;
      let newColId = idMapping.columns[elementData.colId] || elementData.colId;

      if (idMapping.subRows[elementData.rowId]) {
        newRowId = idMapping.subRows[elementData.rowId];
        newColId = idMapping.subColumns[elementData.colId] || elementData.colId;
      }

      const newElement = {
        id: newElementId,
        index: this.children.length,
        rowId: newRowId,
        colId: newColId,
        y: newY,
        templateId: emailStore?.id || "",
        sizeId: this.id,
      };

      if (
        elementData.type === ELEMENT_TEMPLATE_TYPE.GROUP &&
        elementData.elementIds
      ) {
        const newGroupId = uuidv4();
        const groupElementIds = [];
        elementData.elementIds.forEach(childId => {
          const childData = dataToPaste.elements.find(el => el.id === childId);
          if (childData) {
            const newChildId = uuidv4();
            const childOffset = childData.y - dataToPaste.y;
            const newChildY = newRow.y + childOffset;

            let newChildRowId = newRow.id;
            let newChildColId =
              idMapping.columns[childData.colId] || childData.colId;

            if (idMapping.subRows[childData.rowId]) {
              newChildRowId = idMapping.subRows[childData.rowId];
              newChildColId =
                idMapping.subColumns[childData.colId] || childData.colId;
            }

            const newChildElement = {
              id: newChildId,
              index: this.children.length,
              rowId: newChildRowId,
              colId: newChildColId,
              x: childData.x,
              y: newChildY,
              templateId: emailStore?.id || "",
              sizeId: this.id,
              groupId: newGroupId,
            };
            groupElementIds.push(newChildId);

            this.children.push(
              new Element({
                ...childData,
                ...newChildElement,
              })
            );
          }
        });

        const newGroupElement = {
          ...newElement,
          id: newGroupId,
          elementIds: groupElementIds,
        };

        this.children.push(
          new GroupElementStore({
            ...elementData,
            ...newGroupElement,
          })
        );
      } else {
        this.children.push(
          new Element({
            ...elementData,
            ...newElement,
          })
        );
      }
    });

    this.rows.splice(insertIndex, 0, newRow);
    this.rows.slice(insertIndex + 1).forEach((row, index) => {
      const actualIndex = insertIndex + 1 + index;
      const newRowY =
        this.rows[actualIndex - 1].y + this.rows[actualIndex - 1].height;
      row.columns.forEach(col => {
        if (col.subRows) {
          col.subRows.forEach(subRow => {
            subRow.columns.forEach(subCol => {
              this.children.forEach(el => {
                if (el.rowId === subRow.id && el.colId === subCol.id) {
                  const elementOffset = el.y - row.y;
                  el.y = newRowY + elementOffset;
                }
              });
            });
          });
        } else {
          this.children.forEach(el => {
            if (el.rowId === row.id && el.colId === col.id) {
              if (el.groupId) {
                return;
              }
              const elementOffset = el.y - row.y;
              el.y = newRowY + elementOffset;
            }
          });
        }
      });
      row.y = newRowY;
    });
    this.reorderRows();
    this.syncCanvasHeight();
    this.setSelected(newRow.id, "selectedRowId");
    onSuccess?.();
  };

  deleteRow = () => {
    if (this.selectedRowId) {
      const rowIndex = this.getRowIndexById(this.selectedRowId);
      const row = this.rows[rowIndex];
      if (rowIndex > -1) {
        if (rowIndex < this.rows.length - 1) {
          for (let i = rowIndex + 1; i < this.rows.length; i++) {
            this.rows[i].y -= row.height;
            const _row = this.rows[i];
            _row.columns.forEach(col => {
              if (col.subRows) {
                col.subRows.forEach(subRow => {
                  subRow.columns.forEach(subCol => {
                    this.children.forEach(el => {
                      if (el.rowId === subRow.id && el.colId === subCol.id) {
                        el.y -= row.height;
                      }
                    });
                  });
                });
              } else {
                this.children.forEach(el => {
                  const isGroupedElement =
                    el?.groupId && this.getElementById(el.groupId);
                  if (
                    el.rowId === _row.id &&
                    el.colId === col.id &&
                    !isGroupedElement
                  ) {
                    el.y -= row.height;
                  }
                });
              }
            });
          }
        }
        row.columns.forEach(col => {
          if (col.subRows) {
            col.subRows.forEach(subRow => {
              subRow.columns.forEach(subCol => {
                this.children = this.children.filter(
                  el => el.rowId !== subRow.id || el.colId !== subCol.id
                );
              });
            });
          } else {
            this.children = this.children.filter(
              el => el.rowId !== row.id || el.colId !== col.id
            );
          }
        });
        this.rows.splice(rowIndex, 1);
        this.clearSelected();
        // active next or previous Row
        if (rowIndex <= this.rows.length - 1) {
          this.setSelected(this.rows[rowIndex].id, "selectedRowId");
        } else if (rowIndex > 0) {
          this.setSelected(this.rows[rowIndex - 1].id, "selectedRowId");
        }
        // if (this.rows.length === 0) {
        //   this.addNewRow();
        // }
        this.syncCanvasHeight();
      }
      const event = new CustomEvent("resetThumbnailEmailPage");
      window.dispatchEvent(event);
    }
  };

  deleteSubRow = () => {
    if (!this.selectedSubRowId) return;

    const subRow = this.getRowById(this.selectedSubRowId);
    if (!subRow) return;

    const pCol = this.getColumnInfo(subRow.rowId, subRow.colId);
    if (!pCol) return;

    // const pageB = emailStore.pages.find(page => page.id !== this.id);
    this._deleteSubRow(subRow, pCol);

    // if (pageB) {
    //   const linkedRow = pageB.getRowByLinkedId(subRow.linkedId);
    //   if (linkedRow) {
    //     const linkedPCol = pageB.getColumnInfo(
    //       linkedRow.rowId,
    //       linkedRow.colId
    //     );
    //     if (linkedPCol) {
    //       pageB._deleteSubRow(linkedRow, linkedPCol);
    //     }
    //   }
    // }
  };

  _deleteSubRow = (subRow, parentColumn) => {
    const index = parentColumn.subRows.findIndex(sr => sr.id === subRow.id);
    if (index === -1) return;

    const removedHeight = subRow.height;
    this.children = this.children.filter(el => el.rowId !== subRow.id);
    parentColumn.subRows.splice(index, 1);
    parentColumn.subRows.slice(index).forEach(sr => {
      sr.y -= removedHeight;
      sr.columns.forEach(col => {
        this.children.forEach(el => {
          if (el.rowId === sr.id && el.colId === col.id) {
            el.y -= removedHeight;
          }
        });
      });
    });
    if (parentColumn.subRows.length === 0) {
      parentColumn.subRows = undefined;
    }

    this.deleteEmptySubRow(parentColumn.id);

    this.clearSelected();
    this.syncCanvasHeight();
  };

  deleteEmptySubRow = (colId, subRowId) => {
    let parentColumn, parentRow, subRow;

    if (subRowId) {
      subRow = this.getRowById(subRowId);
      if (!subRow) return;
      parentRow = this.getRowById(subRow.rowId);
      parentColumn = parentRow?.columns?.find(col =>
        colId ? col.id === colId : col.subRows?.some(sr => sr.id === subRow.id)
      );
    } else if (colId) {
      for (const row of this.rows) {
        parentColumn = row.columns.find(col => col.id === colId);
        if (parentColumn) {
          parentRow = row;
          break;
        }
      }
    }

    if (!parentColumn || !parentRow) return;

    if (subRowId && !this.children.some(el => el.rowId === subRowId)) {
      const index = parentColumn.subRows.findIndex(sr => sr.id === subRow.id);
      if (index !== -1) {
        const removedHeight = subRow.height;
        parentColumn.subRows.splice(index, 1);
        parentColumn.subRows.slice(index).forEach(sr => {
          sr.y -= removedHeight;
          sr.columns.forEach(col => {
            this.children.forEach(el => {
              if (el.rowId === sr.id && el.colId === col.id) {
                el.y -= removedHeight;
              }
            });
          });
        });
      }
    }

    const isLastSubCell =
      !this.children.some(
        el => el.rowId === parentRow.id && el.colId === parentColumn.id
      ) &&
      parentColumn.subRows?.length === 1 &&
      parentColumn.subRows[0].columns.length === 1;

    if (isLastSubCell) {
      const [lastSubRow] = parentColumn.subRows;
      const [lastSubCol] = lastSubRow.columns;
      this.children.forEach(el => {
        if (el.rowId === lastSubRow.id && el.colId === lastSubCol.id) {
          el.rowId = parentRow.id;
          el.colId = parentColumn.id;
          el.x = parentColumn.x + (parentColumn.width - el.width) / 2;
          el.y = parentColumn.y + (el.y - lastSubRow.y);
        }
      });
      parentColumn.subRows = undefined;
    }

    if (parentColumn.subRows?.length === 0) {
      parentColumn.subRows = undefined;
    }

    this.clearSelected();
    this.syncCanvasHeight();
    window.dispatchEvent(new CustomEvent("resetThumbnailEmailPage"));
  };

  moveRow = rowId => {
    if (rowId === this.blockHovering?.rowId) {
      return;
    }
    const toIndex = this.getRowIndexById(this.blockHovering?.rowId);
    const fromIndex = this.getRowIndexById(rowId);
    if (fromIndex === -1 || toIndex === -1) {
      return;
    }
    this.movingRow = true;
    const insertIndex =
      toIndex === 0 && this.blockHovering?.side === "bottom"
        ? toIndex + 1
        : toIndex === this.rows.length && this.blockHovering?.side === "top"
          ? toIndex - 1
          : toIndex === 0 && this.blockHovering?.side === "top"
            ? 0
            : toIndex === this.rows.length && this.blockHovering?.side === "bottom"
              ? this.rows.length
              : fromIndex < toIndex && this.blockHovering?.side === "top"
                ? toIndex - 1
                : fromIndex < toIndex
                  ? toIndex
                  : this.blockHovering?.side === "top"
                    ? toIndex
                    : toIndex + 1;

    const calculateElementOffsets = (rows, children, startIndex, endIndex) => {
      const elementOffsets = {};
      for (let i = startIndex; i <= endIndex; i++) {
        const row = rows[i];
        row.columns.forEach(col => {
          const processSubRows = subRow => {
            subRow.columns.forEach(subCol => {
              children.forEach(el => {
                if (el.rowId === subRow.id && el.colId === subCol.id) {
                  elementOffsets[el.id] = el.y - row.y;
                }
              });
            });
          };
          if (col.subRows) {
            col.subRows.forEach(processSubRows);
          } else {
            children.forEach(el => {
              if (el.rowId === row.id && el.colId === col.id) {
                elementOffsets[el.id] = el.y - row.y;
              }
            });
          }
        });
      }
      return elementOffsets;
    };

    const updateRowPositions = (
      rows,
      startIndex,
      endIndex,
      elementOffsets,
      children
    ) => {
      for (let i = startIndex; i <= endIndex; i++) {
        const row = rows[i];
        row.columns.forEach(col => {
          const processSubRows = subRow => {
            subRow.columns.forEach(subCol => {
              children.forEach(el => {
                if (el.rowId === subRow.id && el.colId === subCol.id) {
                  el.y = row.y + elementOffsets[el.id];
                }
              });
            });
          };
          if (col.subRows) {
            col.subRows.forEach(processSubRows);
          } else {
            children.forEach(el => {
              const isGroupedElement =
                el?.groupId && this.getElementById(el.groupId);
              if (
                el.rowId === row.id &&
                el.colId === col.id &&
                !isGroupedElement
              ) {
                el.y = row.y + elementOffsets[el.id];
              }
            });
          }
        });
      }
    };

    const startIndex = Math.min(fromIndex, toIndex);
    const endIndex = Math.max(fromIndex, toIndex);
    // Cached elements y offsets from row
    const elementOffsets = calculateElementOffsets(
      this.rows,
      this.children,
      startIndex,
      endIndex
    );

    const [movedRow] = this.rows.splice(fromIndex, 1);
    this.rows.splice(insertIndex, 0, movedRow);

    this.rows.forEach((row, index) => {
      row.y =
        index === 0 ? 0 : this.rows[index - 1].y + this.rows[index - 1].height;
    });

    // Re-assign element position
    updateRowPositions(
      this.rows,
      startIndex,
      endIndex,
      elementOffsets,
      this.children
    );

    this.movingRow = false;
  };

  convertToFreeFormBlock = rowId => {
    if (rowId) {
      const row = this.getRowById(rowId);
      if (row) {
        if (this.isMobileView) {
          // const desktopPage = emailStore.pages.find(
          //   page => page.id !== this.id
          // );
          // if (desktopPage) {
          //   desktopPage.convertToFreeFormBlock(rowId);
          //   emailStore.syncResponsive(
          //     desktopPage.id,
          //     desktopPage.pageRows,
          //     "rows"
          //   );
          //   emailStore.syncResponsive(
          //     desktopPage.id,
          //     desktopPage.childrenToJson,
          //     "children"
          //   );
          //   return;
          // }
        }
        const newColumn = this.generateColumn(rowId, this.width, 0, row.height);
        // Update elements
        row.columns.forEach(col => {
          if (col.subRows) {
            col.subRows.forEach(subRow => {
              subRow.columns.forEach(subCol => {
                this.children.forEach(el => {
                  if (el.rowId === subRow.id && el.colId === subCol.id) {
                    el.rowId = rowId;
                    el.colId = newColumn.id;
                  }
                });
              });
            });
          } else {
            this.children.forEach(el => {
              if (el.rowId === row.id && el.colId === col.id) {
                el.rowId = rowId;
                el.colId = newColumn.id;
              }
            });
          }
        });
        // Update row type
        row.rowType = "free-blocks";
        row.columns = [newColumn];
      }
    }
  };

  // Column
  generateColumn = (rowId, width = this.width, x = 0, height = 450, y = 0) => {
    return {
      id: uuidv4(),
      rowId: rowId,
      x,
      y,
      width: width,
      height,
    };
  };

  getColumnByLinkedId(row, linkedId) {
    if (!row || !linkedId) {
      return null;
    }
    let column = row.columns.find(col => col.linkedId === linkedId);
    if (!column) {
      row.columns.forEach(col => {
        if (col.subRows) {
          col.subRows.forEach(subRow => {
            subRow.columns.forEach(subCol => {
              if (subCol.linkedId === linkedId) {
                return subCol;
              }
            });
          });
        }
      });
    }
    return column;
  }

  getColumnInfo(rowId, colId) {
    const row = this.getRowById(rowId);
    return row ? row.columns.find(col => col.id === colId) : null;
  }

  getLeftColumnId(rowId, colId) {
    const row = this.getRowById(rowId);
    if (row) {
      const columnIndex = row.columns.findIndex(col => col.id === colId);
      if (columnIndex > 0) {
        return row.columns[columnIndex - 1].id; // Return the ID of the left column
      }
    }
    return null; // Return null if no left column exists
  }

  resizeColumn = (colId, rowId, newX, newWidth) => {
    const column = this.getColumnInfo(rowId, colId);
    const row = this.getRowById(rowId);
    let appends = {
      x: 0,
      y: 0,
    };
    const isSubRow = row?.colId && row?.rowId;
    if (isSubRow) {
      const pRow = this.getRowById(row.rowId);
      const pCol = this.getColumnInfo(row.rowId, row.colId);
      appends.x += pRow.x + pCol.x;
      appends.y += pRow.y + pCol.y;
    }
    const socialGroupIds = this.children
      .filter(el => el.elementType === ELEMENT_TEMPLATE_TYPE.SOCIAL_GROUP)
      .map(el => el.id);
    if (column) {
      console.log("Resizing column", colId, "to", newX, newWidth); // Debug log
      // Update the column's position and width
      column.x = newX;
      column.width = newWidth;
      // Update position for elements in the column if they overlap from the right
      // And resize elements in columns to fit the new width if they overlap
      this.children.forEach(el => {
        if (
          el.rowId === rowId &&
          el.colId === colId &&
          !socialGroupIds.includes(el.groupId)
        ) {
          if (el.x + el.width > column.x + column.width + appends.x) {
            el.x = column.x + column.width + appends.x - el.width;
          }
          if (el.x < column.x + appends.x) {
            el.x = newX + appends.x;
          }
          this.fitElementInContainer(el);
        }
      });
      // Update sub rows and columns if they exist
      if (column.subRows) {
        column.subRows.forEach(subRow => {
          const oldSubRowWidth = subRow.width;
          subRow.width = newWidth;
          subRow.columns.forEach((subCol, index) => {
            const withPercentage = subCol.width / oldSubRowWidth;
            subCol.width = newWidth * withPercentage;
            subCol.x =
              index === 0
                ? subRow.x
                : subRow.columns[index - 1].x + subRow.columns[index - 1].width;
            this.children.forEach(el => {
              if (
                el.rowId === subRow.id &&
                el.colId === subCol.id &&
                !socialGroupIds.includes(el.groupId)
              ) {
                // Update the element's position
                if (
                  el.x + el.width >
                  newX + subCol.x + subCol.width + subRow.x + column.x
                ) {
                  el.x = newX + subCol.x + subCol.width - el.width;
                } else if (el.x < newX + subCol.x) {
                  el.x = newX + subCol.x;
                } else {
                  // Update the element's position
                  el.x = newX + (el.x - column.x);
                }
                this.fitElementInContainer(el);
              }
            });
          });
        });
      }

      // Handle resizing of the left column if it exists
      const leftColumnId = this.getLeftColumnId(rowId, colId);
      if (leftColumnId) {
        const leftColumn = this.getColumnInfo(rowId, leftColumnId);
        if (leftColumn) {
          leftColumn.width = newX - leftColumn.x;
          // Update position for left elements if they exist and overlap
          this.children.forEach(el => {
            if (
              el.colId === leftColumnId &&
              !socialGroupIds.includes(el.groupId)
            ) {
              if (
                el.x + el.width >
                leftColumn.x + leftColumn.width + appends.x
              ) {
                el.x = leftColumn.x + leftColumn.width + appends.x - el.width;
              }
              if (el.x < leftColumn.x) {
                el.x = leftColumn.x + appends.x;
              }
              this.fitElementInContainer(el);
            }
          });
          if (leftColumn.subRows) {
            leftColumn.subRows.forEach(subRow => {
              const oldSubRowWidth = subRow.width;
              subRow.width = leftColumn.width;
              subRow.columns.forEach((subCol, index) => {
                const withPercentage = subCol.width / oldSubRowWidth;
                subCol.width = leftColumn.width * withPercentage;
                subCol.x =
                  index === 0
                    ? subRow.x
                    : subRow.columns[index - 1].x +
                    subRow.columns[index - 1].width;
                this.children.forEach(el => {
                  if (
                    el.rowId === subRow.id &&
                    el.colId === subCol.id &&
                    !socialGroupIds.includes(el.groupId)
                  ) {
                    // Update the element's position
                    this.fitElementInContainer(el);
                  }
                });
              });
            });
          }
        }
      }
    }
  };

  resizeColumnWidth = (rowId, colId, newWidth) => {
    if (!rowId || !colId || !newWidth) {
      return;
    }
    const row = this.getRowById(rowId);
    if (!row) {
      return;
    }
    const column = this.getColumnInfo(rowId, colId);
    if (!column) {
      return;
    }
    const colIndex = row.columns.findIndex(col => col.id === colId);
    const widthOffset = column.width - newWidth;
    const partOffset = widthOffset / (row.columns.length - 1);
    if (colIndex === 0) {
      const isScaleDown = newWidth < column.width;
      column.width = newWidth;
      if (isScaleDown) {
        this.children.forEach(el => {
          if (el.rowId === rowId && el.colId === colId) {
            this.fitElementInContainer(el);
          }
        });
      }
      if (column.subRows) {
        column.subRows.forEach(subRow => {
          const oldSubRowWidth = subRow.width;
          subRow.width = newWidth;
          subRow.columns.forEach((subCol, index) => {
            const withPercentage = subCol.width / oldSubRowWidth;
            subCol.width = newWidth * withPercentage;
            subCol.x =
              index === 0
                ? subRow.x
                : subRow.columns[index - 1].x + subRow.columns[index - 1].width;
            this.children.forEach(el => {
              if (el.rowId === subRow.id && el.colId === subCol.id) {
                this.fitElementInContainer(el);
              }
            });
          });
        });
      }
      for (let i = colIndex + 1; i < row.columns.length; i++) {
        const nextCol = row.columns[i];
        const prevCol = row.columns[i - 1];
        const newX = prevCol.x + prevCol.width;
        nextCol.x = newX;
        nextCol.width = nextCol.width + partOffset;
        if (nextCol.subRows) {
          nextCol.subRows.forEach(subRow => {
            const oldSubRowWidth = subRow.width;
            subRow.width = nextCol.width;
            subRow.columns.forEach((subCol, index) => {
              const withPercentage = subCol.width / oldSubRowWidth;
              subCol.width = nextCol.width * withPercentage;
              subCol.x =
                index === 0
                  ? subRow.x
                  : subRow.columns[index - 1].x +
                  subRow.columns[index - 1].width;
              this.children.forEach(el => {
                if (el.rowId === subRow.id && el.colId === subCol.id) {
                  this.fitElementInContainer(el);
                }
              });
            });
          });
        } else {
          this.children.forEach(el => {
            if (el.rowId === rowId && el.colId === nextCol.id) {
              this.fitElementInContainer(el);
            }
          });
        }
      }
    } else if (colIndex === row.columns.length - 1) {
      const isScaleDown = newWidth < column.width;
      column.width = newWidth;
      column.x = (row.width || this.width) - newWidth;
      if (column.subRows) {
        column.subRows.forEach(subRow => {
          const oldSubRowWidth = subRow.width;
          subRow.width = column.width;
          subRow.columns.forEach((subCol, index) => {
            const withPercentage = subCol.width / oldSubRowWidth;
            subCol.width = column.width * withPercentage;
            subCol.x =
              index === 0
                ? subRow.x
                : subRow.columns[index - 1].x + subRow.columns[index - 1].width;
            this.children.forEach(el => {
              if (el.rowId === subRow.id && el.colId === subCol.id) {
                this.fitElementInContainer(el);
              }
            });
          });
        });
      } else {
        if (isScaleDown) {
          this.children.forEach(el => {
            if (el.rowId === rowId && el.colId === colId) {
              this.fitElementInContainer(el);
            }
          });
        }
      }
      for (let i = colIndex - 1; i >= 0; i--) {
        const prevCol = row.columns[i];
        const nextCol = row.columns[i + 1];
        prevCol.width = prevCol.width + partOffset;
        prevCol.x = nextCol.x - prevCol.width;
        if (prevCol.subRows) {
          prevCol.subRows.forEach(subRow => {
            const oldSubRowWidth = subRow.width;
            subRow.width = prevCol.width;
            subRow.columns.forEach((subCol, index) => {
              const withPercentage = subCol.width / oldSubRowWidth;
              subCol.width = prevCol.width * withPercentage;
              subCol.x =
                index === 0
                  ? subRow.x
                  : subRow.columns[index - 1].x +
                  subRow.columns[index - 1].width;
              this.children.forEach(el => {
                if (el.rowId === subRow.id && el.colId === subCol.id) {
                  this.fitElementInContainer(el);
                }
              });
            });
          });
        } else {
          this.children.forEach(el => {
            if (el.rowId === rowId && el.colId === prevCol.id) {
              this.fitElementInContainer(el);
            }
          });
        }
      }
    } else {
      column.width = newWidth;
      for (let i = 0; i < row.columns.length; i++) {
        const curCol = row.columns[i];
        const prevCol = row.columns[i - 1];
        const newX = i === 0 ? 0 : prevCol.x + prevCol.width;
        curCol.x = newX;
        if (i !== colIndex) {
          curCol.width = curCol.width + partOffset;
        }
        if (curCol.subRows) {
          curCol.subRows.forEach(subRow => {
            const oldSubRowWidth = subRow.width;
            subRow.width = curCol.width;
            subRow.columns.forEach((subCol, index) => {
              const withPercentage = subCol.width / oldSubRowWidth;
              subCol.width = curCol.width * withPercentage;
              subCol.x =
                index === 0
                  ? subRow.x
                  : subRow.columns[index - 1].x +
                  subRow.columns[index - 1].width;
              this.children.forEach(el => {
                if (el.rowId === subRow.id && el.colId === subCol.id) {
                  this.fitElementInContainer(el);
                }
              });
            });
          });
        } else {
          this.children.forEach(el => {
            if (el.rowId === rowId && el.colId === curCol.id) {
              this.fitElementInContainer(el);
            }
          });
        }
      }
    }
    return column;
  };

  resizeColumnHeight = newHeight => {
    const column = this.getColumnInfo(this.selectedRowId, this.selectedColId);
    const row = this.getRowById(this.selectedRowId);
    if (column && row) {
      let heightOffset = newHeight - column.height;
      let allowUpdateY = true;
      const isKeepColumnStacked = row.stacking === COLUMN_STACKING.KEEP_COLUMNS;
      const isSocialBlocks = row.rowType === "social-block";
      const isMobileView = this.isMobileView;
      column.height = newHeight;
      const socialGroupIds = this.children
        .filter(el => el.elementType === ELEMENT_TEMPLATE_TYPE.SOCIAL_GROUP)
        .map(el => el.id);
      if (!isKeepColumnStacked && !isSocialBlocks && isMobileView) {
        row.height = row.columns.reduce((curr, col) => curr + col.height, 0);
      } else {
        const highestColumnHeight = row.columns.reduce(
          (curr, col) => Math.max(curr, col.height),
          0
        );
        row.height = Math.max(newHeight, highestColumnHeight);
        row.columns.forEach(col => {
          col.height = row.height;
        });
      }
      const colIndex = row.columns.findIndex(col => col.id === column.id);
      this.children.forEach(el => {
        if (el.rowId === row.id && el.colId === column.id) {
          const isCtaOrLink =
            el.elementType === ELEMENT_TEMPLATE_TYPE.CTA ||
            el.elementType === ELEMENT_TEMPLATE_TYPE.LINK;
          const isLine =
            el.elementType === ELEMENT_TEMPLATE_TYPE.LINE ||
            el.elementType === ELEMENT_TEMPLATE_TYPE.LINE_OUTLINE;

          const elementHeight = isLine
            ? calcWrappingLineElement(el).height
            : el.height;

          if (elementHeight > newHeight) {
            if (isLine) {
              this.updateLineElementPosition(
                el,
                {
                  x: row.x + column.x,
                  y: row.y + column.y,
                  width: column.width,
                  height: column.height,
                },
                newHeight / elementHeight
              );
            } else if (isCtaOrLink) {
              const scaleRatio = newHeight / el.height;
              const params = scaleTextElement(el, scaleRatio);
              el.updateElement(params);
            } else if (el.type === ELEMENT_TEMPLATE_TYPE.TEXT) {
              const scaleRatio = (newHeight - 10) / el.height;
              const baseY = column.y + row.y;
              const updatedParams = scaleTextElement(el, scaleRatio);

              el.updateElement({
                ...updatedParams,
                width: el.width,
                y: baseY + (newHeight - updatedParams.height) / 2,
              });
            } else if (
              el.type === ELEMENT_TEMPLATE_TYPE.IMAGE &&
              heightOffset < 0
            ) {
              this.resizeImageElement(
                row.id,
                el,
                newHeight,
                heightOffset,
                true
              );
            } else if (el.elementType === ELEMENT_TEMPLATE_TYPE.SOCIAL_GROUP) {
              const scale = newHeight / el.height;
              const newElement = scaleSocialGroupElement(
                el,
                this.children,
                scale
              );
              if (newElement) {
                el.updateElement({
                  x: newElement.group.x,
                  y: row.y + column.y + newHeight - newElement.group.height,
                  width: newElement.group.width,
                  height: newElement.group.height,
                });
                newElement.children.forEach(child => {
                  const childElement = this.getElementById(child.id);
                  childElement.updateElement({
                    x: child.x,
                    y: child.y,
                    width: child.width,
                    height: child.height,
                  });
                });
              }
            }
          } else {
            if (isLine) {
              const lineWrapper = calcWrappingLineElement(el);
              if (el.y + lineWrapper.height > row.y + column.y + newHeight) {
                this.updateLineElementPosition(el, {
                  x: row.x + column.x,
                  y: row.y + column.y,
                  width: column.width,
                  height: column.height,
                });
              }
            } else {
              if (el.y + el.height > row.y + column.y + newHeight) {
                el.y = row.y + column.y + newHeight - el.height;
              }
            }
          }
        }
      });
      if (column.subRows) {
        const subRowsHeight = column.subRows.reduce(
          (acc, sr) => acc + sr.height,
          0
        );
        if (subRowsHeight > column.height) {
          const lastSubRow = column.subRows[column.subRows.length - 1];
          if (lastSubRow) {
            const offset = subRowsHeight - column.height;
            const maxHeightOffset = Math.max(10, lastSubRow.height - offset);
            if (lastSubRow.height - offset < 10) {
              allowUpdateY = false;
            }
            this.resizeSubRow(lastSubRow.id, maxHeightOffset);
          }
        }
      }
      if (
        allowUpdateY &&
        !isKeepColumnStacked &&
        !isSocialBlocks &&
        isMobileView
      ) {
        // Update next col y position
        for (let i = colIndex + 1; i < row.columns.length; i++) {
          const nextCol = row.columns[i];
          const prevCol = row.columns[i - 1];
          const newY = prevCol.y + prevCol.height;
          if (!nextCol.subRows) {
            this.children.forEach(el => {
              if (
                el.rowId === row.id &&
                el.colId === nextCol.id &&
                !socialGroupIds.includes(el.groupId)
              ) {
                el.y += heightOffset;
              }
            });
          } else {
            nextCol.subRows.forEach(subRow => {
              subRow.columns.forEach(subCol => {
                this.children.forEach(el => {
                  if (
                    el.rowId === subRow.id &&
                    el.colId === subCol.id &&
                    !socialGroupIds.includes(el.groupId)
                  ) {
                    el.y += heightOffset;
                  }
                });
              });
            });
          }
          nextCol.y = newY;
        }
      }

      const rowIndex = this.getRowIndexById(this.selectedRowId);
      for (let i = rowIndex + 1; i < this.rows.length; i++) {
        const nextRow = this.rows[i];
        const prevRow = this.rows[i - 1];
        const newY = prevRow.y + prevRow.height;
        nextRow.columns.forEach(col => {
          if (!col.subRows) {
            this.children.forEach(el => {
              if (
                el.rowId === nextRow.id &&
                el.colId === col.id &&
                !socialGroupIds.includes(el.groupId)
              ) {
                const offset = el.y - nextRow.y;
                el.y = newY + offset;
              }
            });
          } else {
            col.subRows.forEach(subRow => {
              subRow.columns.forEach(subCol => {
                this.children.forEach(el => {
                  if (
                    el.rowId === subRow.id &&
                    el.colId === subCol.id &&
                    !socialGroupIds.includes(el.groupId)
                  ) {
                    const offset = el.y - nextRow.y;
                    el.y = newY + offset;
                  }
                });
              });
            });
          }
        });
        nextRow.y = newY;
      }
      this.syncCanvasHeight();
    }
  };

  checkHasElementsInColumn = (colId, rowId = this.selectedRowId) => {
    let hasChild = false;
    const col = this.getColumnInfo(rowId, colId);
    if (!col) {
      return false;
    }
    if (col?.subRows) {
      hasChild = col.subRows?.some(subRow =>
        subRow?.columns?.some(subCol =>
          this.children.some(
            el => el?.rowId === subRow?.id && el?.colId === subCol?.id
          )
        )
      );
    } else {
      hasChild = this.children.some(el => el.colId === col.id);
    }
    return hasChild;
  };

  duplicateColumn = (colId, rowId) => {
    const column = this.getColumnInfo(rowId, colId);
    const row = this.getRowById(rowId);

    if (!column || !row) {
      return;
    }
    if (row.columns.length >= 6) {
      const allColumnsHaveChildren = row.columns.every(col =>
        this.checkHasElementsInColumn(col.id, rowId)
      );

      if (allColumnsHaveChildren) {
        promiseToastStateStore.createToast({
          label: "You can only have 6 columns per row",
        });
        return;
      }
    }
    this._duplicateColumn(column, row);
  };

  _duplicateColumn = (column, row) => {
    const targetIndex = row?.columns.findIndex(col => col.id === column.id);

    if (!row || !column || targetIndex === -1) {
      return;
    }

    if (
      row.stacking === COLUMN_STACKING.RIGHT_ON_TOP &&
      row.columns.length >= 4
    ) {
      this.updateColumnStacking(row.id, COLUMN_STACKING.LEFT_ON_TOP);
    }

    const isKeepColumns = row.stacking === COLUMN_STACKING.KEEP_COLUMNS;

    let newWidth =
      this.isMobileView && !isKeepColumns
        ? this.width
        : this.width / (row.columns.length + 1);

    const newChildren = [];

    const pageB = emailStore.pages.find(page => page.id !== this.id);
    const linkedRow = pageB?.getRowById(row.id);
    const linkedColumn = pageB?.getColumnInfo(row.id, column.id);
    const newPageBChildren = [];
    let newWidthB =
      pageB?.isMobileView && !isKeepColumns
        ? pageB?.width
        : pageB?.width / (linkedRow?.columns.length + 1);

    // Helper function to ensure elements fit within their containers and center them
    const inBoundedEl = (
      el,
      _row,
      _col,
      pRow = { x: 0, y: 0 },
      pCol = { x: 0, y: 0 }
    ) => {
      if (el.rowId === _row.id && el.colId === _col.id) {
        // Calculate base position for the column
        const baseX = pRow.x + pCol.x + _row.x + _col.x;
        const baseY = pRow.y + pCol.y + _row.y + _col.y;

        // Resize element if it's too large for the column
        if (el.width > _col.width) {
          const ratio = _col.width / el.width;
          if (el.type === ELEMENT_TEMPLATE_TYPE.TEXT) {
            const updatedParams = scaleTextElement(el, ratio);
            el.updateElement(updatedParams);
          } else {
            el.width = _col.width;
            el.height = el.height * ratio;
          }
        } else if (el.height > _col.height) {
          const ratio = _col.height / el.height;
          if (el.type === ELEMENT_TEMPLATE_TYPE.TEXT) {
            const updatedParams = scaleTextElement(el, ratio);
            el.updateElement(updatedParams);
          } else {
            el.height = _col.height;
            el.width = el.width * ratio;
          }
        }

        // Center the element horizontally within the column
        const centerX = baseX + (_col.width - el.width) / 2;
        el.x = centerX;

        // Center the element vertically within the column
        const centerY = baseY + (_col.height - el.height) / 2;
        el.y = centerY;

        // Ensure element doesn't go outside column boundaries
        if (el.x < baseX) {
          el.x = baseX;
        }
        if (el.x + el.width > baseX + _col.width) {
          el.x = baseX + _col.width - el.width;
        }
        if (el.y < baseY) {
          el.y = baseY;
        }
        if (el.y + el.height > baseY + _col.height) {
          el.y = baseY + _col.height - el.height;
        }
      }
    };

    // Helper function to duplicate elements for a specific column
    const duplicateElementsForColumn = (
      sourceCol,
      targetCol,
      sourceRow,
      targetRow,
      bSourceCol,
      bTargetCol,
      bSourceRow,
      bTargetRow
    ) => {
      this.children.forEach(el => {
        if (el.rowId === sourceRow.id && el.colId === sourceCol.id) {
          // Page A
          const offsetX = el.x - sourceRow.x - sourceCol.x;
          const offsetY = el.y - sourceRow.y - sourceCol.y;
          const newElementId = uuidv4();
          const newEl = new Element({
            ...cloneDeep(el),
            id: newElementId,
            rowId: targetRow.id,
            colId: targetCol.id,
            ...(this.isMobileView && !isKeepColumns
              ? {
                y: targetRow.y + targetCol.y + offsetY,
              }
              : {
                x: targetRow.x + targetCol.x + offsetX,
              }),
            index: this.children.length + newChildren.length,
          });
          inBoundedEl(newEl, targetRow, targetCol);
          newChildren.push(newEl);
          // Page B
          const childB = pageB?.getElementById(el.id);
          if (childB) {
            const offsetBX = childB.x - bSourceCol.x - bSourceRow.x;
            const offsetBY = childB.y - bSourceCol.y - bSourceRow.y;
            const newEl = new Element({
              ...cloneDeep(childB),
              id: newElementId,
              rowId: bTargetRow.id,
              colId: bTargetCol.id,
              ...(pageB?.isMobileView && !isKeepColumns
                ? {
                  y: bTargetRow.y + bTargetCol.y + offsetBY,
                }
                : {
                  x: bTargetRow.x + bTargetCol.x + offsetBX,
                }),
              index: pageB?.children.length + newPageBChildren.length,
            });
            inBoundedEl(newEl, bTargetRow, bTargetCol);
            newPageBChildren.push(newEl);
          }
        }
      });
    };

    // Helper function to duplicate subrows and their elements
    const duplicateSubRows = (
      targetRow,
      sourceCol,
      targetCol,
      targetLinkedRow,
      sourceLinkedCol,
      targetLinkedCol
    ) => {
      if (!sourceCol.subRows) return;

      // targetLinkedCol.subRows = [];
      targetCol.subRows = sourceCol.subRows.map((sourceSubRow, subRowIndex) => {
        // const sourceLinkedSubRow = sourceLinkedCol.subRows[subRowIndex];

        const newSubRowId = uuidv4();

        const newSubRow = {
          ...cloneDeep(sourceSubRow),
          id: newSubRowId,
          ...((!this.isMobileView || isKeepColumns) && {
            width: newWidth,
          }),
          rowId: targetRow.id,
          colId: targetCol.id,
          columns: [],
        };
        // const newLinkedSubRow = {
        //   ...cloneDeep(sourceLinkedCol.subRows[subRowIndex]),
        //   id: newSubRowId,
        //   ...((!pageB?.isMobileView || isKeepColumns) && {
        //     width: newWidthB,
        //   }),
        //   rowId: targetLinkedRow.id,
        //   colId: targetLinkedCol.id,
        //   columns: [],
        // };

        // Duplicate subcolumns
        newSubRow.columns = sourceSubRow.columns.map(
          (sourceSubCol, subColIndex) => {
            // const sourceLinkedSubCol = sourceLinkedSubRow.columns[subColIndex];

            const widthPercentage = sourceSubCol.width / sourceSubRow.width;
            const xPercentage = sourceSubCol.x / sourceSubRow.width;
            const newColWidth = newWidth * widthPercentage;
            const newColX = newWidth * xPercentage;

            // const linkedWidthPercentage =
            //   sourceLinkedSubCol.width / sourceLinkedSubRow.width;
            // const linkedXPercentage =
            //   sourceLinkedSubCol.x / sourceLinkedSubRow.width;
            // const newLinkedColWidth = newWidthB * linkedWidthPercentage;
            // const newLinkedColX = newWidthB * linkedXPercentage;

            const newSubColId = uuidv4();
            const newSubCol = {
              ...cloneDeep(sourceSubCol),
              id: newSubColId,
              rowId: newSubRowId,
              ...((!this.isMobileView || isKeepColumns) && {
                width: newColWidth,
                x: newColX,
              }),
            };
            // const newLinkedSubCol = {
            //   ...cloneDeep(sourceLinkedSubCol),
            //   id: newSubColId,
            //   rowId: newSubRowId,
            //   ...((!pageB?.isMobileView || isKeepColumns) && {
            //     width: newLinkedColWidth,
            //     x: newLinkedColX,
            //   }),
            // };
            // Duplicate elements for this subcolumn
            this.children.forEach(el => {
              if (
                el.rowId === sourceSubRow.id &&
                el.colId === sourceSubCol.id
              ) {
                const newElementId = uuidv4();
                const offsetX =
                  el.x -
                  sourceSubCol.x -
                  sourceSubRow.x -
                  sourceCol.x -
                  targetRow.x;
                const offsetY =
                  el.y -
                  sourceSubCol.y -
                  sourceSubRow.y -
                  sourceCol.y -
                  targetRow.y;
                const newEl = new Element({
                  ...cloneDeep(el),
                  id: newElementId,
                  rowId: newSubRowId,
                  colId: newSubColId,
                  ...(this.isMobileView && !isKeepColumns
                    ? {
                      y:
                        targetRow.y +
                        targetCol.y +
                        newSubRow.y +
                        newSubCol.y +
                        offsetY,
                    }
                    : {
                      x:
                        targetRow.x +
                        targetCol.x +
                        newSubRow.x +
                        newSubCol.x +
                        offsetX,
                    }),
                  index: this.children.length + newChildren.length,
                });
                inBoundedEl(newEl, newSubRow, newSubCol, targetRow, targetCol);
                newChildren.push(newEl);
                // Page B
                //   const pageBChild = pageB?.getElementById(el.id);
                //   if (pageBChild) {
                //     const offsetBX =
                //       pageBChild.x -
                //       sourceLinkedSubCol.x -
                //       sourceLinkedSubRow.x -
                //       sourceLinkedCol.x -
                //       targetLinkedRow.x;
                //     const offsetBY =
                //       pageBChild.y -
                //       sourceLinkedSubCol.y -
                //       sourceLinkedSubRow.y -
                //       sourceLinkedCol.y -
                //       targetLinkedRow.y;
                //     const newElB = new Element({
                //       ...cloneDeep(pageBChild),
                //       id: newElementId,
                //       rowId: newLinkedSubRow.id,
                //       colId: newLinkedSubCol.id,
                //       ...(pageB?.isMobileView && !isKeepColumns
                //         ? {
                //             y:
                //               targetLinkedRow.y +
                //               targetLinkedCol.y +
                //               newLinkedSubRow.y +
                //               newLinkedSubCol.y +
                //               offsetBY,
                //           }
                //         : {
                //             x:
                //               targetLinkedRow.x +
                //               targetLinkedCol.x +
                //               newLinkedSubRow.x +
                //               newLinkedSubCol.x +
                //               offsetBX,
                //           }),
                //       index: pageB?.children.length + newPageBChildren.length,
                //     });
                //     inBoundedEl(
                //       newElB,
                //       newLinkedSubRow,
                //       newLinkedSubCol,
                //       targetLinkedRow,
                //       targetLinkedCol
                //     );
                //     newPageBChildren.push(newElB);
                //   }
              }
            });

            // newLinkedSubRow.columns.push(newLinkedSubCol);

            return newSubCol;
          }
        );

        // targetLinkedCol.subRows.push(newLinkedSubRow);

        return newSubRow;
      });
    };

    const hasNextColumn = row?.columns.length > targetIndex + 1;
    const isLastColumn = targetIndex === row.columns.length - 1;
    const hasPrevColumn = targetIndex > 0;

    if (hasNextColumn || (isLastColumn && hasPrevColumn)) {
      let nextColIndex = isLastColumn ? targetIndex - 1 : targetIndex + 1;
      let nextColumn = row.columns[nextColIndex];
      let nextLinkedColumn = linkedRow?.columns[nextColIndex];
      const checkChild = col => {
        let hasChild = false;
        if (col.subRows) {
          // Check subrows for matching column
          hasChild = col.subRows.some(subRow =>
            subRow.columns.some(subCol =>
              this.children.some(
                el => el.rowId === subRow.id && el.colId === subCol.id
              )
            )
          );
        } else {
          // Check direct children for matching column
          hasChild = this.children.some(el => el.colId === col.id);
        }
        return hasChild;
      };
      let hasChild = checkChild(nextColumn);
      if (hasChild) {
        while (nextColIndex < row.columns.length) {
          nextColumn = row.columns[nextColIndex];
          nextLinkedColumn = linkedRow?.columns[nextColIndex];
          hasChild = checkChild(nextColumn);
          if (!hasChild) {
            break;
          }
          nextColIndex++;
        }
        if (hasChild && targetIndex !== 0) {
          nextColIndex = targetIndex - 1;
          nextColumn = row.columns[nextColIndex];
          nextLinkedColumn = linkedRow?.columns[nextColIndex];
          hasChild = checkChild(nextColumn);
          if (hasChild) {
            while (nextColIndex >= 0) {
              nextColumn = row.columns[nextColIndex];
              nextLinkedColumn = linkedRow?.columns[nextColIndex];
              hasChild = checkChild(nextColumn);
              if (!hasChild) {
                break;
              }
              nextColIndex--;
            }
          }
        }
      }
      if (!hasChild) {
        newWidth = nextColumn.width;
        newWidthB = nextLinkedColumn?.width || 0;

        if (column?.subRows) {
          duplicateSubRows(
            row,
            column,
            nextColumn,
            linkedRow,
            linkedColumn,
            nextLinkedColumn
          );
        } else {
          duplicateElementsForColumn(
            column,
            nextColumn,
            row,
            row,
            linkedColumn,
            nextLinkedColumn,
            linkedRow,
            linkedRow
          );
        }

        // Add new children to the page
        this.children = [...this.children, ...newChildren];
        if (pageB) {
          pageB.children = [...pageB.children, ...newPageBChildren];
        }
        // if (this.isMobileView && !isKeepColumns) {
        //   const rowHeight = row.columns.reduce(
        //     (acc, col) => acc + col.height,
        //     0
        //   );
        //   if (rowHeight > row.height) {
        //     this.resizeRow(row.id, row.y, rowHeight);
        //   }
        // }
        // if (pageB?.isMobileView && !isKeepColumns) {
        //   const rowHeight = linkedRow.columns.reduce(
        //     (acc, col) => acc + col.height,
        //     0
        //   );
        //   if (rowHeight > linkedRow.height) {
        //     pageB?.resizeRow(linkedRow.id, linkedRow.y, rowHeight);
        //   }
        // }
        this.syncCanvasHeight();
        pageB?.syncCanvasHeight();
        return;
      }
    }

    const newColumn = {
      ...cloneDeep(column),
      id: uuidv4(),
      width: newWidth,
    };
    const newLinkedColumn = {
      ...cloneDeep(linkedColumn),
      id: newColumn.id,
      width: newWidthB,
    };

    // Update existing columns' positions and widths
    row.columns.forEach((col, colIndex) => {
      const oldColX = col.x;
      const oldColY = col.y;
      // Page b
      // const oldLinkedColX = linkedRow.columns[colIndex].x;
      // const oldLinkedColY = linkedRow.columns[colIndex].y;

      if (this.isMobileView && !isKeepColumns) {
        col.y =
          colIndex === 0
            ? 0
            : row.columns[colIndex - 1].y +
            row.columns[colIndex - 1].height +
            (colIndex === targetIndex + 1 ? newColumn.height : 0);
      } else {
        col.width = newWidth;
        col.x =
          colIndex === 0
            ? 0
            : row.columns[colIndex - 1].x +
            row.columns[colIndex - 1].width +
            (colIndex === targetIndex + 1 ? newColumn.width : 0);
      }

      // Page b
      // const linkedCol = linkedRow.columns[colIndex];
      // if (pageB?.isMobileView && !isKeepColumns) {
      //   linkedRow.columns[colIndex].y =
      //     colIndex === 0
      //       ? 0
      //       : linkedRow.columns[colIndex - 1].y +
      //         linkedRow.columns[colIndex - 1].height +
      //         (colIndex === targetIndex + 1 ? newLinkedColumn.height : 0);
      // } else {
      //   linkedCol.width = newWidthB;
      //   linkedCol.x =
      //     colIndex === 0
      //       ? 0
      //       : linkedRow.columns[colIndex - 1].x +
      //         linkedRow.columns[colIndex - 1].width +
      //         (colIndex === targetIndex + 1 ? newLinkedColumn.width : 0);
      // }

      if (colIndex === targetIndex) {
        if (this.isMobileView && !isKeepColumns) {
          newColumn.y = col.y + col.height;
        } else {
          newColumn.x = col.x + col.width;
        }
        // if (pageB?.isMobileView && !isKeepColumns) {
        //   newLinkedColumn.y = linkedCol.y + linkedCol.height;
        // } else {
        //   newLinkedColumn.x = linkedCol.x + linkedCol.width;
        // }
      }

      // Update existing elements' positions
      this.children.forEach(el => {
        if (el.rowId === row.id && el.colId === col.id) {
          if (this.isMobileView && !isKeepColumns) {
            const offset = el.y - oldColY - row.y;
            el.y = col.y + row.y + offset;
          } else {
            const offset = el.x - oldColX - row.x;
            el.x = col.x + row.x + offset;
          }
          inBoundedEl(el, row, col);
          // Page b
          // const pageBChild = pageB?.getElementById(el.id);
          // if (pageBChild) {
          //   if (pageB?.isMobileView && !isKeepColumns) {
          //     const offset = pageBChild.y - oldLinkedColY - linkedRow.y;
          //     pageBChild.y =
          //       linkedRow.y + linkedRow.columns[colIndex].y + offset;
          //   } else {
          //     const offset = pageBChild.x - oldLinkedColX - linkedRow.x;
          //     pageBChild.x =
          //       linkedRow.x + linkedRow.columns[colIndex].x + offset;
          //   }
          //   inBoundedEl(pageBChild, linkedRow, linkedRow.columns[colIndex]);
          // }
        }
      });

      // Update subrows if they exist
      if (col.subRows) {
        col.subRows.forEach((subRow, subRowIndex) => {
          // const linkedSubRow = linkedRow.columns[colIndex].subRows[subRowIndex];
          const oldSubRowWidth = subRow.width;
          // const oldLinkedSubRowWidth = linkedSubRow.width;
          if (!this.isMobileView || isKeepColumns) {
            subRow.width = newWidth;
          }
          // Page b
          // if (!pageB?.isMobileView || isKeepColumns) {
          //   linkedSubRow.width = newWidth;
          // }
          subRow.columns.forEach((subCol, subColIndex) => {
            // const linkedSubCol = linkedSubRow.columns[subColIndex];
            if (!this.isMobileView || isKeepColumns) {
              const widthPercentage = subCol.width / oldSubRowWidth;
              const xPercentage = subCol.x / oldSubRowWidth;
              const newColWidth = newWidth * widthPercentage;
              const newColX = newWidth * xPercentage;
              subCol.width = newColWidth;
              subCol.x = newColX;
            }
            // Page b
            // if (!pageB?.isMobileView || isKeepColumns) {
            //   const widthPercentage = linkedSubCol.width / oldLinkedSubRowWidth;
            //   const xPercentage = linkedSubCol.x / oldLinkedSubRowWidth;
            //   const newLinkedColWidth = newWidthB * widthPercentage;
            //   const newLinkedColX = newWidthB * xPercentage;
            //   linkedSubCol.width = newLinkedColWidth;
            //   linkedSubCol.x = newLinkedColX;
            // }
            // Update existing elements' positions
            this.children.forEach(el => {
              if (el.rowId === subRow.id && el.colId === subCol.id) {
                if (this.isMobileView && !isKeepColumns) {
                  const offset = el.y - subRow.y - subCol.y - col.y - row.y;
                  el.y = subRow.y + subCol.y + col.y + row.y + offset;
                } else {
                  const offset = el.x - subRow.x - subCol.x - col.x - row.x;
                  el.x = subRow.x + subCol.x + col.x + row.x + offset;
                }
                inBoundedEl(el, subRow, subCol, row, col);
                // Page b
                // const pageBChild = pageB?.getElementById(el.id);
                // if (pageBChild) {
                //   if (pageB?.isMobileView && !isKeepColumns) {
                //     const offset =
                //       pageBChild.y -
                //       linkedRow.y -
                //       linkedSubRow.y -
                //       linkedSubCol.y;
                //     pageBChild.y =
                //       linkedRow.y + linkedSubRow.y + linkedSubCol.y + offset;
                //   } else {
                //     const offset =
                //       pageBChild.x -
                //       linkedRow.x -
                //       linkedSubRow.x -
                //       linkedSubCol.x;
                //     pageBChild.x =
                //       linkedRow.x + linkedSubRow.x + linkedSubCol.x + offset;
                //   }
                //   inBoundedEl(
                //     pageBChild,
                //     linkedSubRow,
                //     linkedSubCol,
                //     linkedRow,
                //     linkedColumn
                //   );
                // }
              }
            });
          });
        });
      }
    });

    // Duplicate elements and subrows for the target column
    // TODO: Update B
    if (column.subRows) {
      duplicateSubRows(
        row,
        column,
        newColumn,
        linkedRow,
        linkedColumn,
        newLinkedColumn
      );
    } else {
      duplicateElementsForColumn(
        column,
        newColumn,
        row,
        row,
        linkedColumn,
        newLinkedColumn,
        linkedRow,
        linkedRow
      );
    }

    // Insert the new column
    row.columns.splice(targetIndex + 1, 0, newColumn);
    // linkedRow.columns.splice(targetIndex + 1, 0, newLinkedColumn);
    // Add new children to the page
    this.children = [...this.children, ...newChildren];
    // if (pageB) {
    //   pageB.children = [...pageB.children, ...newPageBChildren];
    // }
    // if (this.isMobileView && !isKeepColumns) {
    //   this.resizeRow(row.id, row.y, row.height + newColumn.height);
    // }
    // if (pageB?.isMobileView && !isKeepColumns) {
    //   pageB?.resizeRow(
    //     linkedRow.id,
    //     linkedRow.y,
    //     linkedRow.height + newLinkedColumn.height
    //   );
    // }

    if (row.rowType === "social-block") {
      this.updateSocialLayoutColumn(row);
    }

    this.syncCanvasHeight();
    pageB?.syncCanvasHeight();
  };

  deleteSubColumn = (colId, subRowId) => {
    if (!colId || !subRowId) return;

    const subRow = this.getRowById(subRowId);
    const parentRow = this.getRowById(subRow?.rowId);
    const columnIndex = subRow?.columns?.findIndex(col => col.id === colId);
    const column = subRow?.columns?.[columnIndex];
    const parentColumn = parentRow?.columns?.find(col =>
      col.subRows?.some(sr => sr.id === subRow?.id)
    );
    if (!subRow || !parentRow || !parentColumn || columnIndex === -1 || !column)
      return;

    const deletedWidth = column.width;
    subRow.columns.splice(columnIndex, 1);
    this.children = this.children.filter(
      el => !(el.rowId === subRow.id && el.colId === colId)
    );

    if (subRow.columns.length === 0) return this.deleteSubRow();

    const totalWidth = subRow.columns.reduce((sum, c) => sum + c.width, 0);
    subRow.columns.forEach(col => {
      col.width += (deletedWidth * col.width) / totalWidth;
    });

    let x = 0;
    subRow.columns.forEach(col => {
      col.x = x;
      this.children.forEach(el => {
        if (el.rowId === subRow.id && el.colId === col.id) {
          const pCol = this.getColumnInfo(subRow.rowId, subRow.colId);
          el.x = pCol.x + col.x + (col.width - el.width) / 2;
        }
      });
      x += col.width;
    });

    subRow.width = x;

    this.deleteEmptySubRow(parentColumn.id);

    this.clearSelected();
    this.syncCanvasHeight();
    window.dispatchEvent(new CustomEvent("resetThumbnailEmailPage"));
  };

  deleteColumn = (colId, rowId) => {
    if (!colId || !rowId) return;

    const column = this.getColumnInfo(rowId, colId);
    const row = this.getRowById(rowId);
    if (!column || !row) {
      return;
    }

    // const pageB = emailStore.pages.find(page => page.id !== this.id);
    this._deleteColumn(column, row);

    // if (pageB) {
    //   const linkedRow = pageB.getRowById(row.id);
    //   const linkedColumn = pageB.getColumnInfo(row.id, column.id);
    //   if (linkedRow && linkedColumn) {
    //     pageB._deleteColumn(linkedColumn, linkedRow);
    //   }
    // }
  };

  _deleteColumn = (column, row) => {
    if (!column || !row) return;

    const isSocialBlock = row.rowType === "social-block";
    const isKeepColumnStacked = row.stacking === COLUMN_STACKING.KEEP_COLUMNS;
    const columnIndex = row.columns.findIndex(col => col.id === column.id);
    if (columnIndex === -1) return;

    if (isSocialBlock) {
      this.deleteSocialBlockColumn(column, row);
      return;
    }

    const socialGroupElements = this.children.filter(
      element => element.elementType === ELEMENT_TEMPLATE_TYPE.SOCIAL_GROUP
    );
    const socialGroupIds = socialGroupElements.map(element => element.id);

    const deletedColumnSize =
      this.isMobileView && !isKeepColumnStacked ? column.height : column.width;

    if (column.subRows) {
      column.subRows.forEach(subRow => {
        subRow.columns.forEach(subCol => {
          this.children = this.children.filter(
            el => !(el.rowId === subRow.id && el.colId === subCol.id)
          );
        });
      });
    } else {
      this.children = this.children.filter(
        el => !(el.rowId === row.id && el.colId === column.id)
      );
    }
    row.columns.splice(columnIndex, 1);

    if (row.columns.length === 0) {
      this.deleteRow();
      return;
    }

    const remainingColumns = row.columns;

    if (this.isMobileView && !isKeepColumnStacked) {
      remainingColumns.forEach((col, index) => {
        if (index >= columnIndex) {
          col.y -= deletedColumnSize;

          if (col.subRows) {
            col.subRows.forEach(subRow => {
              subRow.columns.forEach(subCol => {
                this.children.forEach(el => {
                  if (el.rowId === subRow.id && el.colId === subCol.id) {
                    el.y -= deletedColumnSize;
                  }
                });
              });
            });
          } else {
            this.children.forEach(el => {
              if (el.rowId === row.id && el.colId === col.id) {
                el.y -= deletedColumnSize;
              }
            });
          }
        }
      });

      // row.height = remainingColumns.reduce((sum, c) => sum + c.height, 0);
    } else {
      let totalSize = remainingColumns.reduce((sum, c) => sum + c.width, 0);

      if (totalSize > 0) {
        const oldSubColPositions = new Map();
        remainingColumns.forEach(col => {
          if (col.subRows) {
            col.subRows.forEach(subRow => {
              subRow.columns.forEach(subCol => {
                oldSubColPositions.set(subCol.id, subCol.x);
              });
            });
          }
        });

        remainingColumns.forEach(col => {
          const ratio = col.width / totalSize;
          const expandedWidth = deletedColumnSize * ratio;
          col.width += expandedWidth;

          if (col.subRows) {
            col.subRows.forEach(subRow => {
              subRow.width = col.width;
              subRow.columns.forEach(subCol => {
                subCol.width += expandedWidth / subRow.columns.length;
              });

              let subCurrentX = 0;
              subRow.columns.forEach(subCol => {
                subCol.x = subCurrentX;
                subCurrentX += subCol.width;
              });
            });
          }
        });

        const expandedWidthPerColumn =
          deletedColumnSize / remainingColumns.length;

        let currentPosition = 0;
        remainingColumns.forEach(col => {
          const xOffset = currentPosition - col.x;
          col.x = currentPosition;

          if (col.subRows) {
            col.subRows.forEach(subRow => {
              subRow.columns.forEach(subCol => {
                const oldSubColX = oldSubColPositions.get(subCol.id) || 0;
                const subColXOffset = subCol.x - oldSubColX;

                this.children.forEach(el => {
                  if (el.rowId === subRow.id && el.colId === subCol.id) {
                    el.x = el.x + xOffset + subColXOffset;
                  }
                });
              });
            });
          } else {
            this.children.forEach(el => {
              const isElementInSocialGroup = socialGroupIds.includes(
                el.groupId
              );
              if (
                el.rowId === row.id &&
                el.colId === col.id &&
                !isElementInSocialGroup
              ) {
                el.x += xOffset + expandedWidthPerColumn / 2;
              }
            });
          }
          currentPosition += col.width;
        });
      }

      totalSize = remainingColumns.reduce((sum, c) => sum + c.width, 0);

      let currentPosition = 0;
      remainingColumns.forEach(col => {
        const ratio = col.width / totalSize;
        const expandedWidth = deletedColumnSize * ratio;
        const xOffset = currentPosition - col.x;
        col.x = currentPosition;

        if (col.subRows) {
          col.subRows.forEach(subRow => {
            subRow.columns.forEach(subCol => {
              const expandedSubColWidth = expandedWidth / subRow.columns.length;
              this.children.forEach(el => {
                const isElementInSocialGroup = socialGroupIds.includes(
                  el.groupId
                );
                if (
                  el.rowId === subRow.id &&
                  el.colId === subCol.id &&
                  !isElementInSocialGroup
                ) {
                  el.x = el.x + xOffset + expandedSubColWidth / 2;
                }
              });
            });
          });
        }
        currentPosition += col.width;
      });

      // row.width = remainingColumns.reduce((sum, c) => sum + c.width, 0);
    }

    this.clearSelected();
    this.syncCanvasHeight();
    window.dispatchEvent(new CustomEvent("resetThumbnailEmailPage"));
  };

  updateSocialLayoutColumn = row => {
    if (!row || row.rowType !== "social-block") return;

    const SOCIAL_ICON_WIDTH = 24;
    const SOCIAL_ICON_GAP = 16;
    const iconColumnWidth = SOCIAL_ICON_WIDTH + SOCIAL_ICON_GAP;

    const totalColumns = row.columns.length;
    const iconCount = Math.max(0, totalColumns - 2);

    if (totalColumns < 2) return;

    const totalMiddleWidth = iconCount * iconColumnWidth;
    const sideColumnWidth = (row.width - totalMiddleWidth) / 2;

    let currentX = 0;
    row.columns.forEach((col, index) => {
      col.x = currentX;

      if (index === 0 || index === totalColumns - 1) {
        col.width = sideColumnWidth;
      } else {
        col.width = iconColumnWidth;
      }

      currentX += col.width;
    });

    row.columns.forEach(col => {
      this.children.forEach(el => {
        if (el.rowId === row.id && el.colId === col.id) {
          el.x = col.x + (col.width - el.width) / 2;
          // el.y = row.y + (col.height - el.height) / 2;
        }
      });
    });

    this.clearSelected();
    window.dispatchEvent(new CustomEvent("resetThumbnailEmailPage"));
  };

  deleteSocialBlockColumn = (column, row) => {
    const columnIndex = row.columns.findIndex(col => col.id === column.id);
    const syncedPage = emailStore.pages.find(page => page.id !== this.id);

    if (!column || !row) return;
    if (row.rowType !== "social-block") return;
    if (columnIndex === -1) return;

    if (column.subRows) {
      column.subRows.forEach(subRow => {
        subRow.columns.forEach(subCol => {
          this.children = this.children.filter(
            el => !(el.rowId === subRow.id && el.colId === subCol.id)
          );
        });
      });
    } else {
      this.children = this.children.filter(
        el => !(el.rowId === row.id && el.colId === column.id)
      );
    }

    row.columns.splice(columnIndex, 1);

    if (row.columns.length === 0) {
      this.deleteRow();
      return;
    }
    this.updateSocialLayoutColumn(row);
    if (syncedPage) {
      const syncRow = syncedPage.getRowById(row.id);
      const syncColumn = syncedPage.getColumnInfo(row.id, column.id);
      if (syncRow && syncColumn) {
        syncedPage.deleteSocialBlockColumn(syncColumn, syncRow);
      }
    }
  };

  swapColumns = rowId => {
    const row = this.getRowById(rowId);
    if (!row || !row.columns || row.columns.length < 2) {
      return;
    }

    const isStacked = row.stacking === COLUMN_STACKING.KEEP_COLUMNS;
    const isSocialBlock = row.rowType === "social-block";
    const isVertical = this.isMobileView && !isStacked && !isSocialBlock;
    const socialGroupElements = this.children.filter(
      element => element.elementType === ELEMENT_TEMPLATE_TYPE.SOCIAL_GROUP
    );
    const socialGroupIds = socialGroupElements.map(element => element.id);

    const { updatedRow, originalOffset } = swapColumnsInRow(row, isVertical);
    this.rows = this.rows.map(r => (r.id === rowId ? updatedRow : r));

    this.children.forEach(child => {
      const isElementInSocialGroup = socialGroupIds.includes(child.groupId);
      if (isElementInSocialGroup) {
        return;
      }
      if (originalOffset[child.colId]) {
        if (isVertical) {
          child.y += originalOffset[child.colId];
        } else {
          child.x += originalOffset[child.colId];
        }
      }
    });

    window.dispatchEvent(new CustomEvent("resetThumbnailEmailPage"));
  };

  swapColumnsByIndex = (rowId, fromIndex, toIndex) => {
    const row = this.getRowById(rowId);
    if (!row || !row.columns || row.columns.length < 2) {
      return;
    }

    const isStacked = row.stacking === COLUMN_STACKING.KEEP_COLUMNS;
    const isSocialBlock = row.rowType === "social-block";
    const isVertical = this.isMobileView && !isStacked && !isSocialBlock;
    const socialGroupElements = this.children.filter(
      element => element.elementType === ELEMENT_TEMPLATE_TYPE.SOCIAL_GROUP
    );
    const socialGroupIds = socialGroupElements.map(element => element.id);

    const { updatedRow, originalOffset } = moveColumnToIndex(
      row,
      fromIndex,
      toIndex,
      isVertical
    );
    this.rows = this.rows.map(r => (r.id === rowId ? updatedRow : r));

    this.children.forEach(child => {
      const isElementInSocialGroup = socialGroupIds.includes(child.groupId);
      if (isElementInSocialGroup) {
        return;
      }
      if (originalOffset[child.colId]) {
        if (isVertical) {
          child.y += originalOffset[child.colId];
        } else {
          child.x += originalOffset[child.colId];
        }
      }
    });

    window.dispatchEvent(new CustomEvent("resetThumbnailEmailPage"));
  };

  swapSubRowsByIndex = (rowId, fromIndex, toIndex) => {
    const row = this.getRowById(rowId);
    if (!row) {
      return;
    }
    const parentColumn = this.getColumnInfo(row.rowId, row.colId);
    if (
      !parentColumn ||
      !parentColumn.subRows ||
      parentColumn.subRows.length < 2
    ) {
      return;
    }
    const socialGroupElements = this.children.filter(
      element => element.elementType === ELEMENT_TEMPLATE_TYPE.SOCIAL_GROUP
    );
    const socialGroupIds = socialGroupElements.map(element => element.id);

    const { updatedColumn, originalOffset } = moveSubRowToIndex(
      parentColumn,
      fromIndex,
      toIndex
    );
    parentColumn.subRows = updatedColumn.subRows;

    this.children.forEach(child => {
      const isElementInSocialGroup = socialGroupIds.includes(child.groupId);
      if (isElementInSocialGroup) {
        return;
      }
      if (originalOffset[child.rowId]) {
        child.y += originalOffset[child.rowId];
      }
    });

    const cachedSelected = {
      selectedColId: this.selectedColId,
      selectedRowId: this.selectedRowId,
      selectedSubRowId: this.selectedSubRowId,
    };
    this.clearSelected();
    setTimeout(() => {
      this.setSelected(cachedSelected.selectedColId, "selectedColId", true);
      this.setSelected(cachedSelected.selectedRowId, "selectedRowId", true);
      this.setSelected(
        cachedSelected.selectedSubRowId,
        "selectedSubRowId",
        true
      );
    }, 10);
    window.dispatchEvent(new CustomEvent("resetThumbnailEmailPage"));
  };

  fitLineElementInContainer = element => {
    if (typeof element === "string") {
      element = this.getElementById(element);
    }
    const row = this.getRowById(element.rowId);
    const col = this.getColumnInfo(element.rowId, element.colId);

    if (!row || !col) return element;

    const hasParent = !!row.rowId && !!row.colId;
    let containerX = row.x + col.x;
    let containerY = row.y + col.y;
    let containerWidth = col.width;
    let containerHeight = col.height;

    if (hasParent) {
      const parentRow = this.getRowById(row.rowId);
      const parentCol = this.getColumnInfo(row.rowId, row.colId);
      if (parentRow && parentCol) {
        containerX += parentRow.x + parentCol.x;
        containerY += parentRow.y + parentCol.y;
      }
    }

    let lineContainer = calcWrappingLineElement(element);

    const widthScale =
      lineContainer.width > containerWidth
        ? containerWidth / lineContainer.width
        : 1;

    let updateParams = {};
    if (widthScale < 1) {
      const scaledElement = scaleLineElement(element, widthScale);
      updateParams = { ...scaledElement };
    }

    const scaledElement =
      widthScale < 1 ? { ...element, ...updateParams } : element;
    lineContainer = calcWrappingLineElement(scaledElement);

    if (lineContainer.height > containerHeight) {
      if (hasParent) {
        this.resizeSubRow(row.id, lineContainer.height);
        const updatedRow = this.getRowById(element.rowId);
        const updatedCol = this.getColumnInfo(element.rowId, element.colId);
        if (updatedRow && updatedCol) {
          containerHeight = updatedCol.height;
          const parentRow = this.getRowById(updatedRow.rowId);
          const parentCol = this.getColumnInfo(
            updatedRow.rowId,
            updatedRow.colId
          );
          if (parentRow && parentCol) {
            containerX =
              parentRow.x + parentCol.x + updatedRow.x + updatedCol.x;
            containerY =
              parentRow.y + parentCol.y + updatedRow.y + updatedCol.y;
            containerWidth = updatedCol.width;
          }
        }
      } else {
        if (this.isMobileView) {
          this.setSelected(col.id, "selectedColId", false);
          this.setSelected(row.id, "selectedRowId", false);
          this.resizeColumnHeight(lineContainer.height);
          this.setSelected(null, "selectedColId", false);
        } else {
          this.resizeRow(row.id, row.y, lineContainer.height);
        }
      }
      containerHeight = lineContainer.height;
    }

    lineContainer = calcWrappingLineElement(
      widthScale < 1 || Object.keys(updateParams).length > 0
        ? { ...element, ...updateParams }
        : element
    );

    const lineLeft = lineContainer.x;
    const lineTop = lineContainer.y;
    const lineRight = lineContainer.x + lineContainer.width;
    const lineBottom = lineContainer.y + lineContainer.height;

    if (lineLeft < containerX) {
      updateParams.x = element.x + (containerX - lineLeft);
    }
    if (lineTop < containerY) {
      updateParams.y = element.y + (containerY - lineTop);
    }
    if (lineRight > containerX + containerWidth) {
      updateParams.x = element.x + (containerX + containerWidth - lineRight);
    }
    if (lineBottom > containerY + containerHeight) {
      updateParams.y = element.y + (containerY + containerHeight - lineBottom);
    }

    element.updateElement(updateParams);

    return element;
  };

  fitSocialGroupElementInContainer = _element => {
    let element = _element;
    if (typeof _element === "string") {
      element = this.getElementById(_element);
    }
    if (!element) {
      return;
    }
    const row = this.getRowById(element.rowId);
    const col = this.getColumnInfo(row.id, element.colId);
    if (!row || !col) {
      return;
    }

    const hasParent = !!row.rowId && !!row.colId;
    let parentRow, parentCol;
    let containerX = row.x + col.x;
    let containerY = row.y + col.y;
    let containerWidth = col.width;
    let containerHeight = col.height;

    if (hasParent) {
      parentRow = this.getRowById(row.rowId);
      parentCol = this.getColumnInfo(row.rowId, row.colId);
      if (parentRow && parentCol) {
        containerX += parentRow.x + parentCol.x;
        containerY += parentRow.y + parentCol.y;
      }
    }

    const minWidth = getSocialGroupMinWidth(element, this.children);
    let isUpdateElementWidth = false;
    let newWidth = element.width;
    let newHeight = element.height;

    if (element.width > containerWidth) {
      if (minWidth <= containerWidth) {
        newWidth = containerWidth;
        const result = resizeSocialGroupElement(element, this.children, {
          width: newWidth,
          height: newHeight,
        });
        if (result) {
          element.width = newWidth;
          element.height = newHeight;
          result.children.forEach(child => {
            const childElement = this.getElementById(child.id);
            if (childElement) {
              childElement.x = child.x;
              childElement.y = child.y;
            }
          });
          isUpdateElementWidth = true;
        }
      } else {
        const scale = containerWidth / element.width;
        const result = scaleSocialGroupElement(element, this.children, scale);
        if (result) {
          element.x = result.group.x;
          element.y = result.group.y;
          element.width = result.group.width;
          element.height = result.group.height;
          result.children.forEach(child => {
            const childElement = this.getElementById(child.id);
            if (childElement) {
              childElement.x = child.x;
              childElement.y = child.y;
              childElement.width = child.width;
              childElement.height = child.height;
            }
          });
          isUpdateElementWidth = true;
        }
      }
    }
    if (element.height > containerHeight) {
      containerHeight = element.height;
      if (hasParent) {
        this.resizeSubRow(row.id, element.height);
      } else {
        if (this.isMobileView) {
          this.setSelected(col.id, "selectedColId", false);
          this.resizeColumnHeight(element.height);
          this.setSelected(null, "selectedColId", false);
        } else {
          this.resizeRow(row.id, row.y, element.height);
        }
      }
    }

    if (isUpdateElementWidth) {
      newWidth = element.width;
      newHeight = element.height;
    }

    if (element.x < containerX) {
      element.x = containerX;
    }
    if (element.y < containerY) {
      element.y = containerY;
    }
    if (element.x + newWidth > containerX + containerWidth) {
      element.x = containerX + containerWidth - newWidth;
    }
    if (element.y + newHeight > containerY + containerHeight) {
      element.y = containerY + containerHeight - newHeight;
    }
    return element;
  };

  fitElementInContainer = (_element, yBtmOffset = 0) => {
    if (!_element) {
      return;
    }
    let element = _element;
    if (typeof _element === "string") {
      element = this.getElementById(_element);
    }
    if (element) {
      if (element.groupId) return;
      const isRotation = element.rotation;
      const isLine =
        element.elementType === ELEMENT_TEMPLATE_TYPE.LINE ||
        element.elementType === ELEMENT_TEMPLATE_TYPE.LINE_OUTLINE;
      const isSocialGroup =
        element.elementType === ELEMENT_TEMPLATE_TYPE.SOCIAL_GROUP;
      if (isLine) {
        return this.fitLineElementInContainer(element);
      }
      if (isRotation) {
        return this.fitRotatedElementInContainer(element, element.x, element.y);
      }
      if (isSocialGroup) {
        return this.fitSocialGroupElementInContainer(element);
      }
      const row = this.getRowById(element.rowId);
      const col = this.getColumnInfo(element.rowId, element.colId);
      const isCtaOrLink =
        element.elementType === ELEMENT_TEMPLATE_TYPE.CTA ||
        element.elementType === ELEMENT_TEMPLATE_TYPE.LINK;
      const isGroup = element.type === ELEMENT_TEMPLATE_TYPE.GROUP;
      const isChildGroup = !!element.groupId;
      const isText =
        !isCtaOrLink &&
        (element.type === ELEMENT_TEMPLATE_TYPE.TEXT ||
          element.type === ELEMENT_TEMPLATE_TYPE.CUSTOM_TEXT);

      if (row && col) {
        const hasParent = !!row.rowId && !!row.colId;
        let parentRow, parentCol;
        let containerX = row.x + col.x;
        let containerY = row.y + col.y;
        let containerWidth = col.width;
        let containerHeight = col.height;
        if (hasParent) {
          parentRow = this.getRowById(row.rowId);
          parentCol = this.getColumnInfo(row.rowId, row.colId);
          if (parentRow && parentCol) {
            containerX += parentRow.x + parentCol.x;
            containerY += parentRow.y + parentCol.y;
          }
        }
        // Check if element size greater than container
        if (
          (element.width > containerWidth ||
            element.height > containerHeight) &&
          !isCtaOrLink &&
          !isGroup &&
          !isChildGroup
        ) {
          // Scale element to fit container
          const scale = Math.min(
            containerWidth / element.width,
            containerHeight / element.height
          );
          element.width *= scale;
          element.height *= scale;

          if (isText && element) {
            const valueList = element?.valueList;
            const minWidth = valueList?.reduce((maxValue, value) => {
              const currentFontSize = value?.fontSize || element?.fontSize;
              const { width: bulletWidth = 0 } = calcListTypeWidth({
                fontSize: currentFontSize,
                listType: value?.listType,
                maxFontSize: currentFontSize,
                level: value?.listTypeLevel,
              });

              return Math.max(currentFontSize + bulletWidth, maxValue);
            }, 0);

            if (minWidth > containerWidth) {
              element.setElement({
                fontSize: Math.floor(element?.fontSize * scale),
                valueList: element?.valueList?.map(e => ({
                  ...e,
                  fontSize: (e?.fontSize || element?.fontSize) * scale,
                })),
              });
            }
          }
        }
        let elementHeight = isGroup
          ? element.height * element.scaleY
          : element.height;
        let elementWidth = isGroup
          ? element.width * element.scaleX
          : element.width;

        if (isGroup) {
          if (elementWidth > containerWidth) {
            const newScale = containerWidth / elementWidth;
            element.scaleX = newScale;
            element.scaleY = newScale;
          }
          if (elementHeight > containerHeight) {
            const newScale = containerHeight / elementHeight;
            element.scaleX = newScale;
            element.scaleY = newScale;
          }
        }
        // Scale CTA to fit container
        if (isCtaOrLink) {
          // Check if element exceeds container bounds and apply scaling
          if (element.width > containerWidth) {
            const scaleX = containerWidth / element.width;

            if (scaleX < 1) {
              const params = scaleTextElement(element, scaleX);
              element.updateElement(params);

              elementHeight = Math.floor(element.height * scaleX);
              elementWidth = Math.floor(element.width * scaleX);
            }
            if (elementHeight > containerHeight) {
              containerHeight = elementHeight;
              if (hasParent) {
                this.resizeSubRow(row.id, elementHeight);
              } else {
                if (this.isMobileView) {
                  this.setSelected(col.id, "selectedColId", false);
                  this.resizeColumnHeight(elementHeight);
                  this.setSelected(null, "selectedColId", false);
                } else {
                  this.resizeRow(row.id, row.y, elementHeight);
                }
              }
            }
          }
        }

        if (isText) {
          const { height } = calTextHeight(element, col);
          elementHeight = Math.max(height, elementHeight);
        }
        if (elementHeight > containerHeight) {
          containerHeight = elementHeight;
          if (hasParent) {
            this.resizeSubRow(row.id, elementHeight);
          } else {
            if (this.isMobileView) {
              this.setSelected(col.id, "selectedColId", false);
              this.resizeColumnHeight(elementHeight);
              this.setSelected(null, "selectedColId", false);
            } else {
              this.resizeRow(row.id, row.y, elementHeight);
            }
          }
        }

        // Check if element out of bounds
        if (element.x < containerX) {
          element.x = containerX;
        }
        if (element.y < containerY) {
          element.y = containerY;
        }
        if (element.x + elementWidth > containerX + containerWidth) {
          element.x = containerX + containerWidth - elementWidth;
        }
        if (
          !isText &&
          element.y + elementHeight > containerY + containerHeight
        ) {
          element.y = containerY + containerHeight - elementHeight;
        }
        if (isText) {
          const topOffset = element.y - containerY;
          const requiredBottom =
            topOffset + elementHeight + Math.max(0, yBtmOffset);
          const newContainerHeight = Math.max(
            containerHeight,
            Math.ceil(requiredBottom)
          );
          if (newContainerHeight !== containerHeight) {
            containerHeight = newContainerHeight;
            if (hasParent) {
              this.resizeSubRow(row.id, containerHeight);
            } else {
              if (this.isMobileView) {
                this.setSelected(col.id, "selectedColId", false);
                this.resizeColumnHeight(containerHeight);
                this.setSelected(null, "selectedColId", false);
              } else {
                this.resizeRow(row.id, row.y, containerHeight);
              }
            }
          }
        }
      }
    }
  };

  addBlock = (block, isDrop = false, rowType = "row") => {
    // console.log("add block", block);
    if (block.type !== "blocks") {
      return;
    }
    let row = null;
    if (isDrop && this.blockHovering) {
      const updateRowElement = (row, addedHeight) => {
        row.columns.forEach(col => {
          if (col.subRows) {
            col.subRows.forEach(subRow => {
              subRow.columns.forEach(subCol => {
                this.children.forEach(el => {
                  if (el.rowId === subRow.id && el.colId === subCol.id) {
                    el.y += addedHeight;
                  }
                });
              });
            });
          } else {
            this.children.forEach(el => {
              const isGroupedElement =
                el?.groupId && this.getElementById(el.groupId);
              if (
                el.rowId === row.id &&
                el.colId === col.id &&
                !isGroupedElement
              ) {
                el.y += addedHeight;
              }
            });
          }
        });
      };
      if (this.blockHovering.rowId) {
        const rowIndex = this.getRowIndexById(this.blockHovering.rowId);
        row = this.generateRow(block.sizes);
        if (this.blockHovering.side === "top") {
          row.y = this.rows[rowIndex].y;
          this.rows.splice(rowIndex, 0, row);
          for (let i = rowIndex + 1; i < this.rows.length; i++) {
            const prevRow = this.rows[i - 1];
            const currentRow = this.rows[i];
            currentRow.y = prevRow.y + prevRow.height;
            updateRowElement(currentRow, row.height);
          }
        } else {
          this.rows.splice(rowIndex + 1, 0, row);
          for (let i = rowIndex + 1; i < this.rows.length; i++) {
            const prevRow = this.rows[i - 1];
            const currentRow = this.rows[i];
            this.rows[i].y = prevRow.y + prevRow.height;
            updateRowElement(currentRow, row.height);
          }
        }
        this.setSelected(row.id, "selectedRowId");
      } else {
        row = this.generateRow(block.sizes);
        if (this.blockHovering.side === "top") {
          row.y = 0;
          this.rows.unshift(row);
          this.rows.forEach((r, i) => {
            r.y = i === 0 ? 0 : this.rows[i - 1].y + this.rows[i - 1].height;
            updateRowElement(r, row.height);
          });
        } else {
          row.y = this.rows.length === 0 ? 0 : this.height;
          this.rows.push(row);
        }
        this.setSelected(row.id, "selectedRowId");
      }
      const _row = this.getRowById(row.id);
      _row.rowType = rowType;
      if (["spacer", "divider", "dashed"].includes(rowType)) {
        this.resizeRow(_row.id, _row.y, 20);
      } else {
        this.syncCanvasHeight();
      }
      return _row;
    }
    if (this.selectedRowId) {
      row = this.getRowById(this.selectedRowId);
      if (
        !row ||
        (row &&
          ["divider", "spacer", "dashed", "free-blocks"].includes(row.rowType))
      )
        return;

      const { columns } = row;
      const { sizes } = block;

      if (columns.length === sizes.length) {
        columns.forEach((col, i) => {
          const prevCol = i === 0 ? null : columns[i - 1];
          col.width = (this.width * sizes[i]) / 100;
          col.x = prevCol ? prevCol.x + prevCol.width : 0;
        });
      } else if (columns.length < sizes.length) {
        sizes.forEach((size, i) => {
          const prevCol = i === 0 ? null : columns[i - 1];
          if (i < columns.length) {
            const currentCol = columns[i];
            currentCol.width = this.isMobileView
              ? this.width
              : (this.width * size) / 100;
            currentCol.x =
              prevCol && !this.isMobileView ? prevCol.x + prevCol.width : 0;
            currentCol.y =
              prevCol && this.isMobileView ? prevCol.y + prevCol.height : 0;
            if (!currentCol.subRows) {
              this.children.forEach(el => {
                if (el.rowId === row.id && el.colId === currentCol.id) {
                  this.fitElementInContainer(el);
                }
              });
            } else {
              currentCol.subRows.forEach(sr => {
                sr.width = currentCol.width;
                sr.columns.forEach((sc, scIndex) => {
                  sc.width = sr.width / sr.columns.length;
                  sc.x =
                    scIndex === 0
                      ? sr.x
                      : sr.columns[scIndex - 1].x +
                      sr.columns[scIndex - 1].width;
                  this.children.forEach(el => {
                    if (el.rowId === sr.id && el.colId === sc.id) {
                      this.fitElementInContainer(el);
                    }
                  });
                });
              });
            }
          } else {
            const newCol = this.generateColumn(
              row.id,
              this.isMobileView ? this.width : (this.width * size) / 100,
              prevCol && !this.isMobileView ? prevCol.x + prevCol.width : 0,
              prevCol.height,
              this.isMobileView ? prevCol.y + prevCol.height : 0
            );
            columns.push(newCol);
          }
        });
      } else {
        sizes.forEach((size, i) => {
          const prevCol = i === 0 ? null : columns[i - 1];
          if (i < columns.length) {
            const currentCol = columns[i];
            currentCol.width = this.isMobileView
              ? this.width
              : (this.width * size) / 100;
            currentCol.x =
              prevCol && !this.isMobileView ? prevCol.x + prevCol.width : 0;
            currentCol.y =
              prevCol && this.isMobileView ? prevCol.y + prevCol.height : 0;
            if (!currentCol.subRows) {
              this.children.forEach(el => {
                if (el.rowId === row.id && el.colId === currentCol.id) {
                  this.fitElementInContainer(el);
                }
              });
            } else {
              currentCol.subRows.forEach(sr => {
                sr.width = currentCol.width;
                sr.columns.forEach((sc, scIndex) => {
                  sc.width = sr.width / sr.columns.length;
                  sc.x =
                    scIndex === 0
                      ? sr.x
                      : sr.columns[scIndex - 1].x +
                      sr.columns[scIndex - 1].width;
                  this.children.forEach(el => {
                    if (el.rowId === sr.id && el.colId === sc.id) {
                      this.fitElementInContainer(el);
                    }
                  });
                });
              });
            }
          }
        });
        columns.forEach((col, index) => {
          if (index >= sizes.length) {
            // Remove children
            if (col.subRows) {
              col.subRows.forEach(subRow => {
                subRow.columns.forEach(subCol => {
                  this.children = this.children.filter(
                    el => el.rowId !== subRow.id || el.colId !== subCol.id
                  );
                });
              });
            } else {
              this.children = this.children.filter(
                el => el.rowId !== row.id || el.colId !== col.id
              );
            }
          }
        });
        row.columns = columns.slice(0, sizes.length);
      }
      if (this.isMobileView) {
        const newRowHeight = row.columns.reduce(
          (curr, col) => curr + col.height,
          0
        );
        if (newRowHeight !== row.height) {
          this.resizeRow(row.id, row.y, newRowHeight);
        }
      }
    } else {
      const _row = this.generateRow(block.sizes);
      _row.y = this.rows.length === 0 ? 0 : this.height;
      this.rows.push(_row);
      this.setSelected(_row.id, "selectedRowId");
      row = this.getRowById(_row.id);
      row.rowType = rowType;
      if (["spacer", "divider", "dashed"].includes(rowType)) {
        this.resizeRow(row.id, row.y, 20);
      } else {
        this.syncCanvasHeight();
      }
    }
    return row;
  };
  addSpacer = (isDrop = false) => {
    if (!isDrop) {
      this.clearSelected();
    }
    this.addBlock(
      {
        type: "blocks",
        sizes: [100],
      },
      isDrop,
      "spacer"
    );
  };
  addFreeBlock = (isDrop = false) => {
    if (!isDrop) {
      this.clearSelected();
    }

    const row = this.addBlock(
      {
        type: "blocks",
        sizes: [100],
      },
      isDrop,
      "free-blocks"
    );

    if (row.id && typeof row.height !== "undefined") {
      this.resizeRow(row.id, row.y, 450);
    }
  };
  addDivider = (isDrop = false) => {
    if (!isDrop) {
      this.clearSelected();
    }
    const row = this.addBlock(
      {
        type: "blocks",
        sizes: [100],
      },
      isDrop,
      "divider"
    );
    const col = row.columns[0];
    const newElement = {
      id: uuidv4(),
      type: ELEMENT_TEMPLATE_TYPE.DIVIDER,
      x: 0,
      y: 0,
      width: this.width || 600,
      height: 1, // Add height property back
      strokeWidth: 1,
      stroke: "#000",
      isDragging: false,
      elementType: ELEMENT_TEMPLATE_TYPE.DIVIDER,
      templateId: emailStore?.id || "",
      sizeId: this.id,
      index: this.children.length,
      rowId: row.id,
      colId: col.id,
      resizable: true, // Enable resizing
    };
    const element = new Element(newElement);
    this.children.push(element);
    this.setSelected(element, "selectedElementIds");
  };
  addDashed = (isDrop = false) => {
    if (!isDrop) {
      this.clearSelected();
    }
    const row = this.addBlock(
      {
        type: "blocks",
        sizes: [100],
      },
      isDrop,
      "dashed"
    );
    const col = row.columns[0];
    const newElement = {
      id: uuidv4(),
      type: ELEMENT_TEMPLATE_TYPE.DIVIDER,
      x: 0,
      y: 0,
      width: this.width || 600,
      strokeWidth: 1,
      stroke: "#000",
      isDragging: false,
      elementType: ELEMENT_TEMPLATE_TYPE.DASHED,
      templateId: emailStore?.id || "",
      sizeId: this.id,
      index: this.children.length,
      rowId: row.id,
      colId: col.id,
    };
    const element = new Element(newElement);
    this.children.push(element);
    this.setSelected(element, "selectedElementIds");
  };

  transformLayoutIds = (rows, children, idMap) => {
    const {
      rows: rowIdMap,
      columns: columnIdMap,
      subRows: subRowIdMap,
      subColumns: subColumnIdMap,
      elements: elementIdMap,
      groups: groupIdMap,
    } = idMap;

    const getMappedId = (map, key) => {
      if (!key) {
        return uuidv4();
      }
      if (!map[key]) {
        map[key] = uuidv4();
      }
      return map[key];
    };

    const transformedRows = cloneDeep(rows);
    const transformedChildren = cloneDeep(children);
    const idMapping = {
      rows: {},
      columns: {},
      subRows: {},
      subColumns: {},
      elements: {},
      groups: {},
    };
    transformedRows.forEach(row => {
      const originalRowId = row.id;
      const newRowId = getMappedId(rowIdMap, originalRowId);
      idMapping.rows[originalRowId] = newRowId;
      row.id = newRowId;

      row.columns.forEach(col => {
        const originalColId = col.id;
        const newColId = getMappedId(columnIdMap, originalColId);
        idMapping.columns[originalColId] = newColId;
        col.id = newColId;
        col.rowId = newRowId;

        if (col.subRows) {
          col.subRows.forEach(subRow => {
            const originalSubRowId = subRow.id;
            const newSubRowId = getMappedId(subRowIdMap, originalSubRowId);
            idMapping.subRows[originalSubRowId] = newSubRowId;
            subRow.id = newSubRowId;
            subRow.rowId = newRowId;
            subRow.colId = newColId;

            subRow.columns.forEach(subCol => {
              const originalSubColId = subCol.id;
              const newSubColId = getMappedId(subColumnIdMap, originalSubColId);
              idMapping.subColumns[originalSubColId] = newSubColId;
              subCol.id = newSubColId;
              subCol.rowId = newSubRowId;
            });
          });
        }
      });
    });

    transformedChildren.forEach(el => {
      const originalElementId = el.id;
      const newElementId = getMappedId(elementIdMap, originalElementId);
      idMapping.elements[originalElementId] = newElementId;
      el.id = newElementId;

      if (el.rowId) {
        if (idMapping.subRows[el.rowId]) {
          el.rowId = idMapping.subRows[el.rowId];
          if (el.colId && idMapping.subColumns[el.colId]) {
            el.colId = idMapping.subColumns[el.colId];
          }
        } else if (idMapping.rows[el.rowId]) {
          el.rowId = idMapping.rows[el.rowId];
          if (el.colId && idMapping.columns[el.colId]) {
            el.colId = idMapping.columns[el.colId];
          }
        }
      }
      if (el.type === ELEMENT_TEMPLATE_TYPE.GROUP && !el.groupId) {
        const originalGroupId = el.id;
        const newGroupId = getMappedId(groupIdMap, originalGroupId);
        idMapping.groups[originalGroupId] = newGroupId;
        el.id = newGroupId;

        if (el.elementIds) {
          el.elementIds = el.elementIds.map(elementId => {
            if (idMapping.elements[elementId]) {
              return idMapping.elements[elementId];
            }
            const mappedId = getMappedId(elementIdMap, elementId);
            idMapping.elements[elementId] = mappedId;
            return mappedId;
          });
        }
      }

      if (el.groupId) {
        if (idMapping.groups[el.groupId]) {
          el.groupId = idMapping.groups[el.groupId];
        } else {
          const originalGroupId = el.groupId;
          const newGroupId = getMappedId(groupIdMap, originalGroupId);
          idMapping.groups[originalGroupId] = newGroupId;
          el.groupId = newGroupId;
        }
      }
    });

    return {
      rows: transformedRows,
      children: transformedChildren,
      idMapping,
    };
  };

  addDesktopLayout = (transformedRows, transformedChildren, isDrop = false) => {
    if (transformedRows.length === 0 || transformedChildren.length === 0)
      return;

    const rows = transformedRows;
    const children = transformedChildren;
    let newRowId = null;
    const parentRow = rows.find(row => !row?.colId);

    const updateLayoutPosition = (_row = {}, _children = [], newY = 0) => {
      const row = cloneDeep(_row);
      const resultChildren = [];
      const isFreeBlocks = row.rowType === "free-blocks";

      if (isFreeBlocks) {
        let count = 0;
        row.width = this.width;
        row.height = _row.height * (this.width / _row.width);
        row.y = newY;

        row.columns.forEach((col, colIndex) => {
          const newColumn = {
            ...cloneDeep(col),
            width: row.width,
            height: row.height,
            x: 0,
            y: 0,
          };
          row.columns[colIndex] = newColumn;

          _children.forEach(el => {
            const isGroup =
              el.type === ELEMENT_TEMPLATE_TYPE.GROUP && !el.groupId;
            if (isGroup) {
              const { width: originalWidth, height: originalHeight } = {
                width: _row.width,
                height: _row.height,
              };
              const scaleX = row.width / originalWidth;
              const scaleY = row.height / originalHeight;
              el.scaleX = el.scaleX * scaleX;
              el.scaleY = el.scaleY * scaleY;
              el.x = el.x * scaleX;
              el.y = el.y * scaleY;
              const groupIndex = el.index !== null ? el.index : count++;
              const groupElements = _children.filter(
                element => element.groupId === el.id
              );
              groupElements.forEach((child, elementIndex) => {
                const newGroupChild = new Element({
                  ...child,
                  templateId: this.templateId,
                  rowId: row.id,
                  colId: col.id,
                  index:
                    child.index !== null
                      ? child.index
                      : groupIndex + elementIndex,
                  groupId: el.id,
                });
                resultChildren.push(newGroupChild);
              });
              const newGroup = new GroupElementStore({
                ...el,
                y: el.y + newY,
                index: groupIndex,
                rowId: row.id,
                colId: col.id,
                pageId: this.id,
                templateId: this.templateId,
              });
              resultChildren.push(newGroup);
            } else {
              if (el.groupId) return;
              const newChild = syncElementByRatio(
                new Element({
                  ...el,
                  rowId: row.id,
                  colId: col.id,
                }),
                { width: _row.width, height: _row.height },
                { width: row.width, height: row.height },
                _row,
                row,
                _children,
                resultChildren
              );
              resultChildren.push(new Element(newChild));
            }
          });
        });
        return {
          row,
          children: resultChildren,
        };
      }

      row.columns.forEach((col, colIndex) => {
        const prevCol = colIndex === 0 ? null : row.columns[colIndex - 1];
        const colY = !prevCol ? 0 : prevCol.y + prevCol.height;
        const newHeight = (this.width * col.height) / col.width;

        if (col.subRows) {
          col.subRows.forEach(subRow => {
            subRow.columns.forEach((subCol, subColIndex) => {
              _children.forEach(el => {
                if (el.rowId === subRow.id && el.colId === subCol.id) {
                  const yOffset = el.y - row.y;
                  const xOffset = el.x;
                  const newChild = new Element({
                    ...el,
                    y: newY + yOffset,
                    x: xOffset,
                    rowId: subRow.id,
                    colId: subCol.id,
                  });
                  resultChildren.push(newChild);
                }
              });
            });
          });
        } else {
          _children.forEach(el => {
            if (el.rowId === row.id && el.colId === col.id) {
              const yOffset = el.y - row.y;
              const xOffset = el.x;
              if (isFreeBlocks) {
                let scaleValueList = el.valueList;
                const scaleX = this.width / col.width;
                const scaleY = newHeight / col.height;
                const scaledYOffset = (el.y - row.y) * scaleY;
                const scaledXOffset = el.x * scaleX;
                if (el.type === "text") {
                  const firstItem = scaleValueList[0] || {};
                  const isSameFontSize = scaleValueList.every(
                    item => item.fontSize === firstItem?.fontSize
                  );
                  scaleValueList = scaleValueList.map(item => {
                    return {
                      ...item,
                      fontSize: isSameFontSize
                        ? Math.floor(firstItem.fontSize * scaleX)
                        : Math.floor(item.fontSize * scaleX),
                    };
                  });
                }
                const newChild = new Element({
                  ...el,
                  y: newY + scaledYOffset,
                  x: scaledXOffset,
                  width: el.width * scaleX,
                  height: el.height * scaleY,
                  rowId: row.id,
                  colId: col.id,
                  ...(el.type === "text" && {
                    valueList: scaleValueList,
                    fontSize: Math.floor(el.fontSize * scaleX),
                  }),
                });
                resultChildren.push(newChild);
              } else {
                const newChild = new Element({
                  ...el,
                  y: newY + yOffset,
                  x: xOffset,
                  rowId: row.id,
                  colId: col.id,
                });
                resultChildren.push(newChild);
              }
            }
          });
        }

        if (isFreeBlocks) {
          col.height = newHeight;
        }
      });

      row.y = newY;
      return {
        row,
        children: resultChildren,
      };
    };

    const updateRowElement = (row, addedHeight) => {
      row.columns.forEach(col => {
        if (col.subRows) {
          col.subRows.forEach(subRow => {
            subRow.columns.forEach(subCol => {
              this.children.forEach(el => {
                if (el.rowId === subRow.id && el.colId === subCol.id) {
                  el.y += addedHeight;
                }
              });
            });
          });
        } else {
          this.children.forEach(el => {
            const isChildOfGroup = Boolean(el?.groupId);
            if (el.rowId === row.id && el.colId === col.id && !isChildOfGroup) {
              el.y += addedHeight;
            }
          });
        }
      });
    };

    const addToLast = () => {
      const data = updateLayoutPosition(
        parentRow,
        children,
        this.rows.length === 0 ? 0 : this.height
      );
      newRowId = data.row.id;
      this.rows.push(data.row);
      this.children = [...this.children, ...data.children];
      this.setSelected(data.row, "selectedRowId");
    };

    if (isDrop && this.blockHovering) {
      if (this.blockHovering.rowId) {
        const rowIndex = this.getRowIndexById(this.blockHovering.rowId);
        if (rowIndex > -1) {
          if (this.blockHovering.side === "top") {
            const currentRow = this.rows[rowIndex];
            const data = updateLayoutPosition(
              parentRow,
              children,
              currentRow.y
            );
            newRowId = data.row.id;
            this.rows.splice(rowIndex, 0, data.row);
            this.children = [...this.children, ...data.children];
            for (let i = rowIndex + 1; i < this.rows.length; i++) {
              const prevRow = this.rows[i - 1];
              const currentRow = this.rows[i];
              currentRow.y = prevRow.y + prevRow.height;
              updateRowElement(currentRow, data.row.height);
            }
            this.setSelected(data.row.id, "selectedRowId");
          } else {
            const currentRow = this.rows[rowIndex];
            const data = updateLayoutPosition(
              parentRow,
              children,
              currentRow.y + currentRow.height
            );
            newRowId = data.row.id;
            this.rows.splice(rowIndex + 1, 0, data.row);
            this.children = [...this.children, ...data.children];
            if (rowIndex + 2 < this.rows.length) {
              for (let i = rowIndex + 2; i < this.rows.length; i++) {
                const prevRow = this.rows[i - 1];
                const currentRow = this.rows[i];
                this.rows[i].y = prevRow.y + prevRow.height;
                updateRowElement(currentRow, data.row.height);
              }
            }
            this.setSelected(data.row.id, "selectedRowId");
          }
        }
      } else {
        if (this.blockHovering.side === "top") {
          const data = updateLayoutPosition(parentRow, children, 0);
          newRowId = data.row.id;
          this.rows.unshift(data.row);
          this.children = [...this.children, ...data.children];
          this.rows.forEach((r, i) => {
            if (i > 0) {
              r.y = this.rows[i - 1].y + this.rows[i - 1].height;
              updateRowElement(r, data.row.height);
            }
          });
          this.setSelected(data.row.id, "selectedRowId");
        } else {
          addToLast();
        }
      }
    } else {
      addToLast();
    }

    this.syncCanvasHeight();
    if (newRowId) {
      const _row = this.getRowById(newRowId);
      if (_row) {
        this.updateWidth(this.width, [_row]);
      }
    }
  };

  addMobileLayout = (transformedRows, transformedChildren, isDrop = false) => {
    if (transformedRows.length === 0 || transformedChildren.length === 0)
      return;

    const rows = transformedRows;
    const children = transformedChildren;
    let newRowId = null;
    const parentRow = rows.find(row => !row?.colId);

    const updateLayoutPosition = (_row = {}, _children = [], newY = 0) => {
      const row = cloneDeep(_row);
      const resultChildren = [];
      const isFreeBlocks = row.rowType === "free-blocks";

      if (isFreeBlocks) {
        let count = 0;
        row.width = this.width;
        row.height = _row.height * (this.width / _row.width);
        row.y = newY;

        row.columns.forEach((col, colIndex) => {
          const newColumn = {
            ...cloneDeep(col),
            width: row.width,
            height: row.height,
            x: 0,
            y: 0,
          };
          row.columns[colIndex] = newColumn;

          _children.forEach(el => {
            const isGroup =
              el.type === ELEMENT_TEMPLATE_TYPE.GROUP && !el.groupId;
            if (isGroup) {
              const { width: originalWidth, height: originalHeight } = {
                width: _row.width,
                height: _row.height,
              };
              const scaleX = row.width / originalWidth;
              const scaleY = row.height / originalHeight;
              el.scaleX = el.scaleX * scaleX;
              el.scaleY = el.scaleY * scaleY;
              el.x = el.x * scaleX;
              el.y = el.y * scaleY;
              const groupIndex = el.index !== null ? el.index : count++;
              const groupElements = _children.filter(
                element => element.groupId === el.id
              );
              groupElements.forEach((child, elementIndex) => {
                const newGroupChild = new Element({
                  ...child,
                  templateId: this.templateId,
                  rowId: row.id,
                  colId: col.id,
                  index:
                    child.index !== null
                      ? child.index
                      : groupIndex + elementIndex,
                  groupId: el.id,
                });
                resultChildren.push(newGroupChild);
              });
              const newGroup = new GroupElementStore({
                ...el,
                y: el.y + newY,
                index: groupIndex,
                rowId: row.id,
                colId: col.id,
                pageId: this.id,
                templateId: this.templateId,
              });
              resultChildren.push(newGroup);
            } else {
              if (el.groupId) return;
              const newChild = syncElementByRatio(
                new Element({
                  ...el,
                  rowId: row.id,
                  colId: col.id,
                }),
                { width: _row.width, height: _row.height },
                { width: row.width, height: row.height },
                _row,
                row,
                _children,
                resultChildren
              );
              resultChildren.push(new Element(newChild));
            }
          });
        });
        return {
          row,
          children: resultChildren,
        };
      }

      row.columns.forEach((col, colIndex) => {
        const prevCol = colIndex === 0 ? null : row.columns[colIndex - 1];
        const colY = !prevCol ? 0 : prevCol.y + prevCol.height;
        const newHeight = (this.width * col.height) / col.width;

        if (col.subRows) {
          col.subRows.forEach((subRow, subRowIndex) => {
            if (row.stacking !== COLUMN_STACKING.KEEP_COLUMNS) {
              if (subRowIndex === 0) {
                subRow.y = 0;
              } else {
                const prevSubRow = col.subRows[subRowIndex - 1];
                subRow.y = prevSubRow.y + prevSubRow.height;
              }
            }

            subRow.columns.forEach((subCol, subColIndex) => {
              _children.forEach(el => {
                if (el.rowId === subRow.id && el.colId === subCol.id) {
                  // Calculate offset of element relative to the parent row
                  // New element Y = newY + (el.y - _row.y)
                  const elementOffset = el.y - _row.y;
                  let xOffset = el.x;

                  const newChild = new Element({
                    ...el,
                    y: newY + elementOffset,
                    x: xOffset,
                    rowId: subRow.id,
                    colId: subCol.id,
                  });
                  resultChildren.push(newChild);
                }
              });
              if (row.stacking !== COLUMN_STACKING.KEEP_COLUMNS) {
                const percentage = (subCol.width / subRow.width) * 100;
                const subColWidth = this.width * (percentage / 100);
                const prevSubCol =
                  subColIndex === 0 ? null : subRow.columns[subColIndex - 1];
                subCol.width = subColWidth;
                subCol.x = prevSubCol ? prevSubCol.x + prevSubCol.width : 0;
              }
            });
            if (row.stacking !== COLUMN_STACKING.KEEP_COLUMNS) {
              subRow.width = this.width;
            }
          });
        } else {
          _children.forEach(el => {
            if (el.rowId === row.id && el.colId === col.id) {
              let yOffset = el.y - _row.y;
              let xOffset = el.x;
              if (isFreeBlocks) {
                let scaleValueList = el.valueList;
                const scaleX = this.width / col.width;
                const scaleY = newHeight / col.height;
                const scaledYOffset = (el.y - _row.y) * scaleY;
                const scaledXOffset = el.x * scaleX;
                if (el.type === "text") {
                  const firstItem = scaleValueList[0] || {};
                  const isSameFontSize = scaleValueList.every(
                    item => item.fontSize === firstItem?.fontSize
                  );
                  scaleValueList = scaleValueList.map(item => {
                    return {
                      ...item,
                      fontSize: isSameFontSize
                        ? Math.floor(firstItem.fontSize * scaleX)
                        : Math.floor(item.fontSize * scaleX),
                    };
                  });
                }
                const newChild = new Element({
                  ...el,
                  y: newY + scaledYOffset,
                  x: scaledXOffset,
                  width: el.width * scaleX,
                  height: el.height * scaleY,
                  rowId: row.id,
                  colId: col.id,
                  ...(el.type === "text" && {
                    valueList: scaleValueList,
                    fontSize: Math.floor(el.fontSize * scaleX),
                  }),
                });
                resultChildren.push(newChild);
              } else {
                const newChild = new Element({
                  ...el,
                  y: newY + yOffset,
                  x: xOffset,
                  rowId: row.id,
                  colId: col.id,
                });
                resultChildren.push(newChild);
              }
            }
          });
        }

        if (isFreeBlocks) {
          col.height = newHeight;
        }
        if (row.stacking !== COLUMN_STACKING.KEEP_COLUMNS) {
          col.width = this.width;
          col.x = 0;
          col.y = colY;
        }
      });

      row.y = newY;
      if (row.stacking !== COLUMN_STACKING.KEEP_COLUMNS) {
        row.height = row.columns.reduce((curr, col) => curr + col.height, 0);
      }
      return {
        row,
        children: resultChildren,
      };
    };

    const updateRowElement = (row, addedHeight) => {
      row.columns.forEach(col => {
        if (col.subRows) {
          col.subRows.forEach(subRow => {
            subRow.columns.forEach(subCol => {
              this.children.forEach(el => {
                if (el.rowId === subRow.id && el.colId === subCol.id) {
                  el.y += addedHeight;
                }
              });
            });
          });
        } else {
          this.children.forEach(el => {
            const isChildOfGroup = Boolean(el?.groupId);
            if (el.rowId === row.id && el.colId === col.id && !isChildOfGroup) {
              el.y += addedHeight;
            }
          });
        }
      });
    };

    const addToLast = () => {
      const data = updateLayoutPosition(
        parentRow,
        children,
        this.rows.length === 0 ? 0 : this.height
      );
      newRowId = data.row.id;
      this.rows.push(data.row);
      this.children = [...this.children, ...data.children];
      this.setSelected(data.row, "selectedRowId");
    };

    if (isDrop && this.blockHovering) {
      if (this.blockHovering.rowId) {
        const rowIndex = this.getRowIndexById(this.blockHovering.rowId);
        if (rowIndex > -1) {
          if (this.blockHovering.side === "top") {
            const currentRow = this.rows[rowIndex];
            const data = updateLayoutPosition(
              parentRow,
              children,
              currentRow.y
            );
            newRowId = data.row.id;
            this.rows.splice(rowIndex, 0, data.row);
            this.children = [...this.children, ...data.children];
            for (let i = rowIndex + 1; i < this.rows.length; i++) {
              const prevRow = this.rows[i - 1];
              const currentRow = this.rows[i];
              currentRow.y = prevRow.y + prevRow.height;
              updateRowElement(currentRow, data.row.height);
            }
            this.setSelected(data.row.id, "selectedRowId");
          } else {
            const currentRow = this.rows[rowIndex];
            const data = updateLayoutPosition(
              parentRow,
              children,
              currentRow.y + currentRow.height
            );
            newRowId = data.row.id;
            this.rows.splice(rowIndex + 1, 0, data.row);
            this.children = [...this.children, ...data.children];
            if (rowIndex + 2 < this.rows.length) {
              for (let i = rowIndex + 2; i < this.rows.length; i++) {
                const prevRow = this.rows[i - 1];
                const currentRow = this.rows[i];
                this.rows[i].y = prevRow.y + prevRow.height;
                updateRowElement(currentRow, data.row.height);
              }
            }
            this.setSelected(data.row.id, "selectedRowId");
          }
        }
      } else {
        if (this.blockHovering.side === "top") {
          const data = updateLayoutPosition(parentRow, children, 0);
          newRowId = data.row.id;
          this.rows.unshift(data.row);
          this.children = [...this.children, ...data.children];
          this.rows.forEach((r, i) => {
            if (i > 0) {
              r.y = this.rows[i - 1].y + this.rows[i - 1].height;
              updateRowElement(r, data.row.height);
            }
          });
          this.setSelected(data.row.id, "selectedRowId");
        } else {
          addToLast();
        }
      }
    } else {
      addToLast();
    }

    this.syncCanvasHeight();
  };

  addLayout = (layout, isDrop = false) => {
    const sharedIdMap = {
      rows: {},
      columns: {},
      subRows: {},
      subColumns: {},
      elements: {},
      groups: {},
    };

    if (!layout) return;
    if (!isDrop) {
      this.clearSelected();
    }

    const desktopRows = this.assignRows(cloneDeep(layout.rows) || []);
    const desktopChildren = this.assignChildren(
      cloneDeep(layout.children) || []
    );
    const mobileRows = this.assignRows(cloneDeep(layout.mobileRows) || []);
    const mobileChildren = this.assignChildren(
      cloneDeep(layout.mobileChildren) || []
    );

    const desktopTransformed = this.transformLayoutIds(
      desktopRows,
      desktopChildren,
      sharedIdMap
    );
    const mobileTransformed = this.transformLayoutIds(
      mobileRows,
      mobileChildren,
      sharedIdMap
    );

    const pageB = emailStore.pages.find(p => p.id !== this.id);
    if (this.isMobileView) {
      this.addMobileLayout(
        mobileTransformed.rows,
        mobileTransformed.children,
        isDrop
      );
      if (pageB) {
        const pageBBlockHovering = pageB.blockHovering;
        pageB.blockHovering = this.blockHovering;
        pageB.addDesktopLayout(
          desktopTransformed.rows,
          desktopTransformed.children,
          isDrop
        );
        pageB.blockHovering = pageBBlockHovering;

        if (
          mobileTransformed.rows.length === 0 ||
          mobileTransformed.children.length === 0
        ) {
          pageB.syncManager.enqueue("rows", () =>
            emailStore.syncResponsive(pageB.id, pageB.pageRows, "rows")
          );
          pageB.syncManager.enqueue("children", () =>
            emailStore.syncResponsive(
              pageB.id,
              pageB.childrenToJson,
              "children"
            )
          );
        }
      }
    } else {
      this.addDesktopLayout(
        desktopTransformed.rows,
        desktopTransformed.children,
        isDrop
      );
      if (pageB) {
        const pageBBlockHovering = pageB.blockHovering;
        pageB.blockHovering = this.blockHovering;
        pageB.addMobileLayout(
          mobileTransformed.rows,
          mobileTransformed.children,
          isDrop
        );
        pageB.blockHovering = pageBBlockHovering;
      }
    }
  };

  deleteSelectedCell = () => {
    const { selectedRowId, selectedColId, selectedSubRowId, selectedSubColId } =
      this;

    if (selectedColId && selectedRowId) {
      this.deleteColumn(selectedColId, selectedRowId);
    } else if (selectedSubColId && selectedSubRowId) {
      this.deleteSubColumn(selectedSubColId, selectedSubRowId);
    } else if (selectedSubRowId && !selectedColId) {
      this.deleteSubRow();
    } else if (
      selectedRowId &&
      !selectedColId &&
      !selectedSubRowId &&
      !selectedSubColId
    ) {
      this.deleteRow();
    }
  };

  // Elements
  getElementById = id => {
    return this.children.find(el => el.id === id);
  };

  getElementByRowCol = (rowId, colId) => {
    return this.children.find(
      el => el.rowId === rowId && el.colId === colId && !el.groupId
    );
  };

  addElement = newElement => {
    if (!this.contentHovering || !this.contentHovering?.colId) {
      this.contentHovering = null;
      return;
    }
    const _element = this.children.find(el => el.id === newElement.id);
    if (!_element && newElement.type === "text" && !newElement.fill) {
      newElement.fill = "#000000";
    }
    const index = this.children.length;

    const row = this.getRowById(this.contentHovering?.rowId);

    const column = this.getColumnInfo(
      this.contentHovering?.rowId,
      this.contentHovering?.colId
    );

    // Add early return if no row/column found
    if (
      !row ||
      !column ||
      row.rowType === "divider" ||
      row.rowType === "spacer" ||
      row.rowType === "dashed"
    ) {
      return;
    }

    const isTextElement =
      (newElement.type === ELEMENT_TEMPLATE_TYPE.TEXT ||
        newElement.type === ELEMENT_TEMPLATE_TYPE.CUSTOM_TEXT) &&
      newElement.elementType !== ELEMENT_TEMPLATE_TYPE.CTA;
    let targetRootRow = row?.rowId ? this.getRowById(row.rowId) : row;

    if (row.rowType === "free-blocks") {
      let addedY = 0;
      let addedX = 0;

      // Handle nested rows if any
      if (row.rowId && row.colId) {
        const parentRow = this.getRowById(row.rowId);
        if (parentRow) {
          const parentColumn = this.getColumnInfo(row.rowId, row.colId);
          if (parentColumn) {
            addedY = parentRow.y + parentColumn.y;
            addedX = parentRow.x + parentColumn.x;
          }
        }
      }

      // Calculate bounds
      const minX = addedX + column.x;
      const maxX = addedX + column.x + column.width;
      const minY = addedY + row.y;
      const maxY = addedY + row.y + row.height;

      // Adjust position to keep element within bounds
      let adjustedX = Math.min(
        Math.max(minX, newElement.x),
        maxX - newElement.width
      );
      let adjustedY = Math.min(
        Math.max(minY, newElement.y),
        maxY - newElement.height
      );
      // If element is larger than container, resize row height
      if (newElement.height > row.height) {
        this.resizeRow(row.id, row.y, newElement.height);
      }
      const adjustedTextColor = isTextElement
        ? getTextColorByBgColor(
          newElement.textFill,
          row?.background || COLOR_HEX_CODE.WHITE
        )
        : newElement.textFill;
      // Keep original position for free-blocks but ensure within bounds
      const elementAttrs = {
        ...newElement,
        id: newElement.id || uuidv4(),
        templateId: emailStore?.id || "",
        sizeId: this.id,
        index,
        rowId: this.contentHovering?.rowId,
        colId: this.contentHovering?.colId,
        x: adjustedX,
        y: adjustedY,
        textFill: adjustedTextColor,
      };

      if (_element) {
        this.setSelected(_element, "selectedElementIds");
        return _element;
      }

      const element = new Element(elementAttrs);
      this.fitElementInContainer(element);
      this.children.push(element);
      this.setSelected(element, "selectedElementIds");
      this.syncCanvasHeight();
      return element;
    }

    const existedEl = this.getElementByRowCol(
      this.contentHovering?.rowId,
      this.contentHovering?.colId
    );

    const socialGroupElements = this.children.filter(
      element => element.elementType === ELEMENT_TEMPLATE_TYPE.SOCIAL_GROUP
    );
    const socialGroupIds = socialGroupElements.map(element => element.id);

    if (existedEl && row.rowType !== "free-blocks") {
      // Disable drop create subRows when hovering top/bottom of social-block
      if (
        row.rowType === "social-block" &&
        ["top", "bottom"].includes(this.contentHovering?.side)
      ) {
        this.clearHovering();
        return;
      }
      // Convert into sub row/col
      const hasParent =
        this.contentHovering?.parentRowId && this.contentHovering?.parentColId;
      if (!hasParent && !column.subRows) {
        if (["left", "right"].includes(this.contentHovering?.side)) {
          const isSocialBlock = row.rowType === "social-block";
          const maxColumn = isSocialBlock
            ? MAX_COLUMN_IN_ROW.SOCIAL
            : MAX_COLUMN_IN_ROW.DEFAULT;
          if (row.columns.length === maxColumn) {
            promiseToastStateStore.createToast({
              label: `You can only have ${maxColumn} columns per row`,
            });
            this.clearHovering();
            return;
          }

          if (
            row.stacking === COLUMN_STACKING.RIGHT_ON_TOP &&
            row.columns.length >= 4
          ) {
            this.updateColumnStacking(row.id, COLUMN_STACKING.LEFT_ON_TOP);
          }

          const isKeepColumnStacked =
            row.stacking === COLUMN_STACKING.KEEP_COLUMNS;
          const newWidth =
            !this.isMobileView || isKeepColumnStacked
              ? this.width / (row.columns.length + 1)
              : this.width;
          const newColX =
            this.contentHovering?.side === "left"
              ? column.x
              : column.x + column.width;
          const newCol = this.generateColumn(row.id, newWidth);
          newCol.height =
            this.isMobileView && !isKeepColumnStacked
              ? Math.max(column.height, newElement.height)
              : row.height;
          newCol.x = this.isMobileView && !isKeepColumnStacked ? 0 : newColX;
          newElement.rowId = row.id;
          newElement.colId = newCol.id;
          const colIndex = row.columns.findIndex(
            col => col.id === this.contentHovering?.colId
          );
          const newColIndex =
            this.contentHovering?.side === "left" ? colIndex : colIndex + 1;
          row.columns.splice(newColIndex, 0, newCol);
          row.columns.forEach((col, index) => {
            const oldX = col.x;
            const oldY = col.y;
            if (!this.isMobileView || isKeepColumnStacked) {
              col.x =
                index === 0
                  ? 0
                  : row.columns[index - 1].x + row.columns[index - 1].width;
              col.width = newWidth;
              col.height = row.height;
            } else {
              col.x = 0;
              col.width = this.width;
              col.y =
                index === 0
                  ? 0
                  : row.columns[index - 1].y + row.columns[index - 1].height;
            }
            if (newElement.rowId === row.id && newElement.colId === col.id) {
              newElement.x = row.x + col.x + (col.width - newElement.width) / 2;
              newElement.y =
                row.y + col.y + (col.height - newElement.height) / 2;
            }
            if (col.subRows) {
              col.subRows.forEach(subRow => {
                subRow.columns.forEach((subCol, subColIndex) => {
                  if (!this.isMobileView || isKeepColumnStacked) {
                    const widthPercent = subCol.width / subRow.width;
                    const newSubColWidth = newWidth * widthPercent;
                    subCol.width = newSubColWidth;
                    subCol.x =
                      subColIndex === 0
                        ? 0
                        : subRow.columns[subColIndex - 1].x +
                        subRow.columns[subColIndex - 1].width;
                    subCol.height = subRow.height;
                    subCol.y = 0;
                  }
                  this.children.forEach(el => {
                    const isElementInSocialGroup = socialGroupIds.includes(
                      el.groupId
                    );
                    if (
                      el.rowId === subRow.id &&
                      el.colId === subCol.id &&
                      (!this.isMobileView ||
                        isKeepColumnStacked ||
                        (this.isMobileView && index > newColIndex)) &&
                      !isElementInSocialGroup
                    ) {
                      el.x =
                        col.x +
                        subRow.x +
                        subCol.x +
                        (subCol.width - el.width) / 2;
                      this.fitElementInContainer(el);
                    }
                  });
                });
                subRow.width = newWidth;
              });
            } else {
              this.children.forEach(el => {
                const isElementInSocialGroup = socialGroupIds.includes(
                  el.groupId
                );
                if (
                  el.rowId === row.id &&
                  el.colId === col.id &&
                  (!this.isMobileView ||
                    isKeepColumnStacked ||
                    (this.isMobileView && index > newColIndex)) &&
                  !isElementInSocialGroup
                ) {
                  const offsetX = el.x - oldX;
                  const offsetY = el.y - oldY;
                  if (!this.isMobileView || isKeepColumnStacked) {
                    el.x = col.x + (col.width - el.width) / 2;
                  } else {
                    el.x = col.x + offsetX;
                    el.y = col.y + offsetY;
                  }
                  this.fitElementInContainer(el);
                }
              });
            }
          });
          if (row.height < newElement.height) {
            if (row.rowId && row.colId) {
              this.resizeSubRow(row.id, newElement.height);
            } else {
              this.resizeRow(row.id, row.y, newElement.height);
            }
          }
          if (this.isMobileView && !isKeepColumnStacked) {
            const allColsHeight = row.columns.reduce((acc, col) => {
              return acc + col.height;
            }, 0);
            if (allColsHeight > row.height) {
              this.resizeRow(row.id, row.y, allColsHeight);
            }
          }
          // } else if (row.columns.length === 1) {
          //   const newRow = this.addNewRow(
          //     this.contentHovering?.side === "top" ? "above" : "below",
          //     this.contentHovering?.rowId
          //   );
          //   if (newRow) {
          //     targetRootRow = newRow;
          //     const newCol = newRow.columns[0];
          //     if (newCol) {
          //       newElement.rowId = newRow.id;
          //       newElement.colId = newCol.id;
          //       // Scale element to fit column
          //       if (newElement.type === ELEMENT_TEMPLATE_TYPE.IMAGE) {
          //         if (newElement.width > newElement.height) {
          //           newElement.height =
          //             (newElement.height * newCol.width) / newElement.width;
          //           newElement.width = newCol.width;
          //         } else {
          //           newElement.width =
          //             (newElement.width * newCol.height) / newElement.height;
          //           newElement.height = newCol.height;
          //         }
          //       }
          //       // Center element
          //       newElement.x = newCol.x + (newCol.width - newElement.width) / 2;
          //       newElement.y =
          //         newRow.y + newCol.y + (newCol.height - newElement.height) / 2;
          //     }
          //   }
        } else {
          // Update existed element
          const createSubRow = (rowId, colId, width, height) => {
            const subRow = this.generateRow([100], width, height);
            subRow.rowId = rowId;
            subRow.colId = colId;
            subRow.width = width;
            return subRow;
          };

          const updateElementPosition = (
            element,
            row,
            column,
            subRow,
            subCol
          ) => {
            const isElementInSocialGroup = socialGroupIds.includes(
              element.groupId
            );
            if (isElementInSocialGroup) {
              return;
            }
            if (element.isNew === undefined) {
              element.y =
                row.y +
                column.y +
                subRow.y +
                subCol.y +
                (subCol.height - element.height) / 2;
              element.x =
                row.x +
                column.x +
                subCol.x +
                (subCol.width - element.width) / 2;
            } else {
              // Check if element out of bounds
              const isLine =
                element.elementType === ELEMENT_TEMPLATE_TYPE.LINE ||
                element.elementType === ELEMENT_TEMPLATE_TYPE.LINE_OUTLINE;
              if (!isLine) {
                if (
                  element.x + element.width >
                  column.x + subCol.x + subCol.width
                ) {
                  element.x =
                    column.x + subCol.x + subCol.width - element.width;
                }
                if (element.x < column.x + subCol.x) {
                  element.x = column.x + subCol.x;
                }
              }
              const offsetY = element.y - (row.y + column.y);
              element.y = row.y + column.y + subRow.y + offsetY;
            }
          };

          const subRow = createSubRow(
            this.contentHovering?.rowId,
            this.contentHovering?.colId,
            column.width,
            column.height
          );
          const existedElCol = subRow.columns[0];
          existedEl.rowId = subRow.id;
          existedEl.colId = existedElCol.id;

          if (existedEl.elementType === ELEMENT_TEMPLATE_TYPE.SOCIAL_GROUP) {
            this.children.forEach(child => {
              if (child.groupId === existedEl.id) {
                child.rowId = subRow.id;
                child.colId = existedElCol.id;
              }
            });
          }

          const newSubRow = createSubRow(
            this.contentHovering?.rowId,
            this.contentHovering?.colId,
            column.width,
            newElement.height + 10
          );
          const newElCol = newSubRow.columns[0];
          if (newElement.rowId && newElement.colId) {
            newElement.updateElement({
              isNew: undefined,
            });
          }
          newElement.rowId = newSubRow.id;
          newElement.colId = newElCol.id;

          column.subRows =
            this.contentHovering?.side === "top"
              ? [newSubRow, subRow]
              : [subRow, newSubRow];

          column.subRows.forEach((subRow, index) => {
            subRow.y =
              index === 0
                ? 0
                : column.subRows[index - 1].y +
                column.subRows[index - 1].height;
            subRow.columns.forEach(subCol => {
              [newElement, existedEl].forEach(el => {
                if (el.rowId === subRow.id && el.colId === subCol.id) {
                  updateElementPosition(el, row, column, subRow, subCol);
                }
              });
            });
          });
          const subRowsHeight = column.subRows.reduce(
            (acc, subRow) => acc + subRow.height,
            0
          );
          if (
            this.isMobileView &&
            row.stacking !== COLUMN_STACKING.KEEP_COLUMNS
          ) {
            if (subRowsHeight > column.height) {
              column.height = subRowsHeight;
              const colIndex = row.columns.findIndex(
                col => col.id === column.id
              );
              if (colIndex > -1) {
                for (let i = colIndex + 1; i < row.columns.length; i++) {
                  const nextCol = row.columns[i];
                  const prevCol = row.columns[i - 1];
                  const newY = prevCol.y + prevCol.height;
                  const offset = newY - nextCol.y;
                  nextCol.y = newY;
                  if (nextCol.subRows) {
                    nextCol.subRows.forEach(subRow => {
                      subRow.columns.forEach(subCol => {
                        this.children.forEach(el => {
                          if (
                            el.rowId === subRow.id &&
                            el.colId === subCol.id
                          ) {
                            el.y += offset;
                          }
                        });
                      });
                    });
                  } else {
                    this.children.forEach(el => {
                      if (el.rowId === row.id && el.colId === nextCol.id) {
                        el.y += offset;
                      }
                    });
                  }
                }
              }
            }
            const colsHeight = row.columns.reduce((acc, col) => {
              return acc + col.height;
            }, 0);
            if (colsHeight > row.height) {
              this.resizeRow(row.id, row.y, colsHeight);
            }
          } else {
            if (column.height < subRowsHeight) {
              if (row.height < subRowsHeight) {
                this.resizeRow(row.id, row.y, subRowsHeight);
              }
            }
          }
        }
      } else {
        if (row.columns.length === 3) {
          promiseToastStateStore.createToast({
            label: "You can only have 3 sub columns per sub row",
          });
          this.clearHovering();
          return;
        }
        const parentRow = this.getRowById(this.contentHovering?.parentRowId);
        const parentColumn = this.getColumnInfo(
          this.contentHovering?.parentRowId,
          this.contentHovering?.parentColId
        );
        if (["top", "bottom"].includes(this.contentHovering?.side)) {
          const subRow = this.generateRow([100], row.width, newElement.height);
          subRow.rowId = this.contentHovering?.parentRowId;
          subRow.colId = this.contentHovering?.parentColId;
          subRow.width = row.width;
          const subCol = subRow.columns[0];
          newElement.rowId = subRow.id;
          newElement.colId = subCol.id;
          const subRowIndex = parentColumn.subRows.findIndex(
            sr => sr.id === this.contentHovering?.rowId
          );
          parentColumn.subRows.splice(
            this.contentHovering?.side === "top"
              ? subRowIndex
              : subRowIndex + 1,
            0,
            subRow
          );
          parentColumn.subRows.forEach((sr, index) => {
            const oldSrY = sr.y;
            sr.y =
              index === 0
                ? 0
                : parentColumn.subRows[index - 1].y +
                parentColumn.subRows[index - 1].height;
            sr.columns.forEach(sc => {
              if (newElement.rowId === sr.id && newElement.colId === sc.id) {
                newElement.y =
                  parentRow.y +
                  parentColumn.y +
                  sr.y +
                  sc.y +
                  (sc.height - newElement.height) / 2;
                newElement.x =
                  parentRow.x +
                  parentColumn.x +
                  sc.x +
                  (sc.width - newElement.width) / 2;
              }
              this.children.forEach(el => {
                if (
                  el.rowId === sr.id &&
                  el.colId === sc.id &&
                  el.id !== newElement.id
                ) {
                  const offsetY =
                    el.y - (parentRow.y + parentColumn.y + oldSrY);
                  el.y = parentRow.y + parentColumn.y + sr.y + offsetY;
                }
              });
            });
          });
          const subRowsHeight = parentColumn.subRows?.reduce(
            (acc, sr) => acc + sr.height,
            0
          );
          if (
            this.isMobileView &&
            parentRow.stacking !== COLUMN_STACKING.KEEP_COLUMNS
          ) {
            if (subRowsHeight > parentColumn.height) {
              parentColumn.height = subRowsHeight;
              const colIndex = parentRow.columns.findIndex(
                col => col.id === parentColumn.id
              );
              if (colIndex > -1) {
                for (let i = colIndex + 1; i < parentRow.columns.length; i++) {
                  const nextCol = parentRow.columns[i];
                  const prevCol = parentRow.columns[i - 1];
                  const newY = prevCol.y + prevCol.height;
                  const offset = newY - nextCol.y;
                  nextCol.y = newY;
                  if (nextCol.subRows) {
                    nextCol.subRows.forEach(subRow => {
                      subRow.columns.forEach(subCol => {
                        this.children.forEach(el => {
                          if (
                            el.rowId === subRow.id &&
                            el.colId === subCol.id
                          ) {
                            el.y += offset;
                          }
                        });
                      });
                    });
                  } else {
                    this.children.forEach(el => {
                      if (
                        el.rowId === parentRow.id &&
                        el.colId === nextCol.id
                      ) {
                        el.y += offset;
                      }
                    });
                  }
                }
              }
            }
            const colsHeight = parentRow.columns.reduce((acc, col) => {
              return acc + col.height;
            }, 0);
            if (colsHeight > parentRow.height) {
              this.resizeRow(parentRow.id, parentRow.y, colsHeight);
            }
          } else {
            if (subRowsHeight > parentRow.height) {
              this.resizeRow(parentRow.id, parentRow.y, subRowsHeight);
            }
          }
        } else if (["left", "right"].includes(this.contentHovering?.side)) {
          if (
            row.stacking === COLUMN_STACKING.RIGHT_ON_TOP &&
            row.columns.length >= 4
          ) {
            this.updateColumnStacking(row.id, COLUMN_STACKING.LEFT_ON_TOP);
          }

          const newWidth = row.width / (row.columns.length + 1);
          const newCol = this.generateColumn(
            this.contentHovering?.rowId,
            newWidth
          );
          newCol.height = Math.max(newElement.height, row.height);
          newElement.rowId = row.id;
          newElement.colId = newCol.id;
          const colIndex = row.columns.findIndex(
            col => col.id === this.contentHovering?.colId
          );
          row.columns.splice(
            this.contentHovering?.side === "left" ? colIndex : colIndex + 1,
            0,
            newCol
          );
          row.columns.forEach((col, index) => {
            col.x =
              index === 0
                ? 0
                : row.columns[index - 1].x + row.columns[index - 1].width;
            col.width = newWidth;
            col.height = Math.max(newCol.height, col.height);
            if (newElement.rowId === row.id && newElement.colId === col.id) {
              newElement.x =
                parentRow.x +
                parentColumn.x +
                row.x +
                col.x +
                (col.width - newElement.width) / 2;
              newElement.y =
                parentRow.y +
                parentColumn.y +
                row.y +
                col.y +
                (col.height - newElement.height) / 2;
            }
            this.children.forEach(el => {
              if (el.rowId === row.id && el.colId === col.id) {
                this.fitElementInContainer(el);
              }
            });
          });
          if (row.height < newElement.height) {
            this.resizeSubRow(row.id, newElement.height);
          }
        }
      }
    } else if (column.subRows) {
      const lastRow = column.subRows[column.subRows.length - 1];
      if (lastRow) {
        const subRow = this.generateRow(
          [100],
          lastRow.width,
          newElement.height
        );
        subRow.rowId = row.id;
        subRow.colId = column.id;
        subRow.x = lastRow.x;
        subRow.width = lastRow.width;
        subRow.y = lastRow.y + lastRow.height;
        subRow.columns.forEach(col => {
          col.height = subRow.height;
          col.width = subRow.width;
          col.x = 0;
          col.y = 0;
        });
        const subCol = subRow.columns[0];
        newElement.rowId = subRow.id;
        newElement.colId = subCol.id;
        column.subRows.push(subRow);
        column.subRows.forEach((sr, index) => {
          sr.y =
            index === 0
              ? 0
              : column.subRows[index - 1].y + column.subRows[index - 1].height;
          sr.columns.forEach(sc => {
            if (newElement.rowId === sr.id && newElement.colId === sc.id) {
              newElement.y =
                row.y +
                column.y +
                sr.y +
                sc.y +
                (sc.height - newElement.height) / 2;
              newElement.x =
                row.x + column.x + sc.x + (sc.width - newElement.width) / 2;
            }
          });
        });
        const allHeights = column.subRows.reduce(
          (curr, sr) => curr + sr.height,
          0
        );
        if (row.height < allHeights) {
          this.resizeRow(row.id, row.y, allHeights);
        }
      }
    } else {
      let addedY = 0;
      let addedX = 0;
      if (row.rowId && row.colId) {
        const parentRow = this.getRowById(row.rowId);
        if (parentRow) {
          const parentColumn = this.getColumnInfo(row.rowId, row.colId);
          if (parentColumn) {
            addedY = parentRow.y + parentColumn.y;
            addedX = parentRow.x + parentColumn.x;
            if (column.height < newElement.height) {
              this.resizeSubRow(row.id, newElement.height);
            }
          }
        }
      } else {
        if (column.height < newElement.height) {
          if (this.isMobileView) {
            this.setSelected(column.id, "selectedColId", false);
            this.setSelected(row.id, "selectedRowId", false);
            this.resizeColumnHeight(newElement.height);
            this.setSelected(null, "selectedColId", false);
            this.setSelected(null, "selectedRowId", false);
          } else {
            this.resizeRow(row.id, row.y, newElement.height);
          }
        }
      }
      newElement.x = addedX + column.x + (column.width - newElement.width) / 2;
      newElement.y =
        addedY + row.y + column.y + (column.height - newElement.height) / 2;
      newElement.rowId = this.contentHovering?.rowId;
      newElement.colId = this.contentHovering.colId;
    }

    const adjustedTextColor = isTextElement
      ? getTextColorByBgColor(
        newElement.textFill,
        targetRootRow?.background || COLOR_HEX_CODE.WHITE
      )
      : newElement.textFill;

    const isTextElementForAutoFit =
      isTextElement &&
      newElement.elementType !== ELEMENT_TEMPLATE_TYPE.CTA &&
      newElement.elementType !== ELEMENT_TEMPLATE_TYPE.LINK;

    const elementAttrs = {
      ...newElement,
      id: newElement.id || uuidv4(),
      templateId: emailStore?.id || "",
      sizeId: this.id,
      index,
      textFill: adjustedTextColor,
      valueList:
        isTextElement &&
          newElement.elementType === ELEMENT_TEMPLATE_TYPE.MULTI_TEXT
          ? newElement.valueList?.map(value => ({
            ...value,
            fill: value.fill
              ? getTextColorByBgColor(
                value.fill,
                targetRootRow?.background || COLOR_HEX_CODE.WHITE
              )
              : value.fill,
          }))
          : newElement.valueList,
      disableSync: row.rowType === "social-block",
      autoFitBackgroundEnabled: isTextElementForAutoFit
        ? true
        : newElement.autoFitBackgroundEnabled,
    };

    if (_element) {
      this.setSelected(_element, "selectedElementIds");
      return _element;
    }
    const element = new Element(elementAttrs);
    this.children.push(element);

    if (row.rowType === "social-block") {
      this.updateSocialLayoutColumn(row);
    }

    if (element.type === ELEMENT_TEMPLATE_TYPE.TEXT) {
      setTimeout(() => {
        this.fitElementInContainer(element);
      }, 10);
    } else {
      this.fitElementInContainer(element);
    }
    this.reorderRows();
    this.setSelected(element, "selectedElementIds");
    this.syncCanvasHeight();
    return element;
  };

  deleteElements = (ids = []) => {
    if (
      !ids ||
      typeof ids !== "object" ||
      this.selectedElement?.elementType === ELEMENT_TEMPLATE_TYPE.DIVIDER ||
      this.selectedElement?.elementType === ELEMENT_TEMPLATE_TYPE.DASHED
    ) {
      this.selectedRowId = this.selectedElement.rowId;
      this.deleteRow();
      return;
    }

    //remove all elementIds from groups
    const elements = this.children.filter(element => ids.includes(element.id));

    elements.forEach(element => {
      if (element.type === ELEMENT_TEMPLATE_TYPE.GROUP && element.elementIds) {
        ids.push(...element.elementIds);
      }
    });

    this.children
      .filter(el => ids.includes(el.id))
      .forEach(el => {
        if (el.rowId && el.colId) {
          const row = this.getRowById(el.rowId);
          const isSocialBlock = row.rowType === "social-block";

          if (isSocialBlock) {
            const col = row.columns.find(col => col.id === el.colId);
            const isFirstOrLastCol =
              col.x === 0 || col.x === row?.width - col?.width;
            if (!isFirstOrLastCol) {
              this.deleteSocialBlockColumn(col, row);
              return;
            }
          }

          if (row && row.rowId && row.colId) {
            const parentRow = this.getRowById(row.rowId);
            const parentColumn = this.getColumnInfo(row.rowId, row.colId);
            if (row.columns.length === 1) {
              parentColumn.subRows = parentColumn.subRows.filter(
                sr => sr.id !== row.id
              );
              // convert sub row to column
              if (parentColumn.subRows.length === 1) {
                const subRow = parentColumn.subRows[0];
                if (subRow.columns.length === 1) {
                  subRow.columns.forEach(subCol => {
                    const children = this.children.filter(
                      e => e.rowId === subRow.id && e.colId === subCol.id
                    );
                    children.forEach(child => {
                      child.rowId = row.rowId;
                      child.colId = row.colId;
                    });
                  });
                  parentColumn.subRows = undefined;
                }
              }
            } else {
              const deletedColumn = row.columns.find(
                col => col.id === el.colId
              );
              const deletedWidth = deletedColumn?.width || 0;
              row.columns = row.columns.filter(col => col.id !== el.colId);

              if (deletedWidth > 0 && row.columns.length > 0) {
                const expandWidth = deletedWidth / row.columns.length;
                row.columns.forEach(col => {
                  col.width += expandWidth;
                });
              }

              row.columns.forEach((col, index) => {
                col.x =
                  index === 0
                    ? 0
                    : row.columns[index - 1].x + row.columns[index - 1].width;
                this.children.forEach(child => {
                  if (child.rowId === row.id && child.colId === col.id) {
                    child.x =
                      parentColumn.x + col.x + (col.width - child.width) / 2;
                  }
                });
              });
            }
            parentColumn.subRows?.forEach((subRow, index) => {
              const newY =
                index === 0
                  ? 0
                  : parentColumn.subRows[index - 1].y +
                  parentColumn.subRows[index - 1].height;
              subRow.columns.forEach(subCol => {
                this.children
                  .filter(
                    child =>
                      child.rowId === subRow.id && child.colId === subCol.id
                  )
                  .forEach(child => {
                    const offsetY = child.y - (parentRow.y + subRow.y);
                    child.y = parentRow.y + newY + offsetY;
                  });
              });
              subRow.y = newY;
            });
          }
        }
      });
    this.children = this.children.filter(el => !ids.includes(el.id));
    this.selectedElementIds = [];
    this.selectedElement = null;
    this.selectedElements = [];
    this.assignIndexAnimations();
    const event = new CustomEvent("resetThumbnailEmailPage");
    window.dispatchEvent(event);
  };

  onElementDrop = (elementId, { x, y, scaleX, scaleY }) => {
    const element = this.getElementById(elementId);
    const originalRowId = element?.rowId;
    const originalColId = element?.colId;
    const isLine =
      element.elementType === ELEMENT_TEMPLATE_TYPE.LINE ||
      element.elementType === ELEMENT_TEMPLATE_TYPE.LINE_OUTLINE;
    const isRotatedElement = !isLine && element.rotation !== 0;
    const isImage = element.elementType === ELEMENT_TEMPLATE_TYPE.IMAGE;
    if (element) {
      if (element.rotation && !isImage) {
        return this.fitRotatedElementInContainer(element, x, y);
      }

      const _scaleX = scaleX || element.scaleX;
      const _scaleY = scaleY || element.scaleY;
      const reposition = (row, column, parentRow, parentColumn) => {
        const isKeepColumnStacked =
          row.stacking === COLUMN_STACKING.KEEP_COLUMNS;
        const hasParent = !!parentRow && !!parentColumn;

        let elementLeft, elementRight, elementTop, elementBottom;

        if (isLine) {
          const lineContainer = calcWrappingLineElement({ ...element, x, y });
          elementLeft = lineContainer.x;
          elementRight = lineContainer.x + lineContainer.width;
          elementTop = lineContainer.y;
          elementBottom = lineContainer.y + lineContainer.height;
        } else if (isRotatedElement) {
          const rotatedWrapper = calcWrappingRotatedElement(element, {
            x,
            y,
          });
          elementLeft = rotatedWrapper.minX;
          elementRight = rotatedWrapper.maxX;
          elementTop = rotatedWrapper.minY;
          elementBottom = rotatedWrapper.maxY;
        } else {
          elementLeft = x;
          elementRight = x + element.width * _scaleX;
          elementTop = y;
          elementBottom = y + element.height * _scaleY;
        }

        if (hasParent) {
          // Check new position out of bound
          const calX = row.x + column.x + parentRow.x + parentColumn.x;
          const calY = row.y + column.y + parentRow.y + parentColumn.y;
          const containerRight = calX + column.width;
          const containerBottom = calY + column.height;

          if (
            elementLeft < calX ||
            elementRight > containerRight ||
            elementTop < calY ||
            elementBottom > containerBottom
          ) {
            // Move element to the edge of the column
            if (elementLeft < calX) {
              x += calX - elementLeft;
            }
            if (elementRight > containerRight) {
              x -= elementRight - containerRight;
            }
            if (elementTop < calY) {
              y += calY - elementTop;
            }
            if (elementBottom > containerBottom) {
              const offset = elementBottom - containerBottom;
              this.resizeSubRow(row.id, row.height + offset, true);
            }
          }
        } else {
          // Check new position out of bound
          const calX = row.x + column.x;
          const calY = row.y + column.y;
          const containerRight = calX + column.width;
          const containerBottom = calY + column.height;

          if (
            elementLeft < calX ||
            elementRight > containerRight ||
            elementTop < calY ||
            elementBottom > containerBottom
          ) {
            // Move element to the edge of the column
            if (elementLeft < calX) {
              x += calX - elementLeft;
            }
            if (elementRight > containerRight) {
              x -= elementRight - containerRight;
            }
            if (elementTop < calY) {
              y += calY - elementTop;
            }
            if (elementBottom > containerBottom) {
              const offset = elementBottom - containerBottom;
              if (this.isMobileView && !isKeepColumnStacked) {
                this.setSelected(row.id, "selectedRowId", false);
                this.setSelected(column.id, "selectedColId", false);
                this.resizeColumnHeight(column.height + offset);
              } else {
                this.resizeRow(row.id, row.y, row.height + offset, true);
              }
            }
          }
        }
      };
      if (this.selectedElements.length > 1) {
        const row = this.getRowById(element.rowId);
        const column = this.getColumnInfo(element.rowId, element.colId);
        if (row && column) {
          const hasParent = row.rowId && row.colId;
          if (hasParent) {
            const parentRow = this.getRowById(row.rowId);
            const parentColumn = this.getColumnInfo(row.rowId, row.colId);
            reposition(row, column, parentRow, parentColumn);
          } else {
            reposition(row, column, null, null);
          }
          element.updateElement({ x, y });
        }
      } else if (
        this.contentHovering?.rowId === element.rowId &&
        this.contentHovering?.colId === element.colId
      ) {
        const row = this.getRowById(element.rowId);
        const column = this.getColumnInfo(element.rowId, element.colId);
        if (row && column) {
          const hasParent =
            this.contentHovering?.parentRowId &&
            this.contentHovering?.parentColId;
          if (hasParent) {
            const parentRow = this.getRowById(
              this.contentHovering?.parentRowId
            );
            const parentColumn = this.getColumnInfo(
              this.contentHovering?.parentRowId,
              this.contentHovering?.parentColId
            );
            reposition(row, column, parentRow, parentColumn);
          } else {
            reposition(row, column, null, null);
          }
          element.updateElement({ x, y });
        }
      } else {
        // Check if source and target are both free-blocks
        const targetRow = this.getRowById(this.contentHovering?.rowId);

        // Disable drop into column that has an element
        if (targetRow?.rowType === "social-block") {
          const targetCol = this.getColumnInfo(
            this.contentHovering?.rowId,
            this.contentHovering?.colId
          );
          if (targetCol) {
            const elementInTargetCol = this.getElementByRowCol(
              this.contentHovering?.rowId,
              this.contentHovering?.colId
            );
            if (elementInTargetCol) {
              this.clearHovering();
              return element;
            }
          }
        }

        // Handle drop into free-blocks from regular blocks or between free-blocks
        if (targetRow?.rowType === "free-blocks") {
          const targetColumn = this.getColumnInfo(
            this.contentHovering?.rowId,
            this.contentHovering?.colId
          );

          if (targetColumn) {
            // Calculate bounds
            const calX = targetRow.x + targetColumn.x;
            const calY = targetRow.y + targetColumn.y;
            let newX = x;
            let newY = y;

            let elementLeft, elementRight, elementTop, elementBottom;

            if (isLine) {
              const lineContainer = calcWrappingLineElement({
                ...element,
                x: newX,
                y: newY,
              });
              elementLeft = lineContainer.x;
              elementRight = lineContainer.x + lineContainer.width;
              elementTop = lineContainer.y;
              elementBottom = lineContainer.y + lineContainer.height;
            } else {
              elementLeft = newX;
              elementRight = newX + element.width * _scaleX;
              elementTop = newY;
              elementBottom = newY + element.height * _scaleY;
            }
            const containerRight = calX + targetColumn.width;
            const containerBottom = calY + targetColumn.height;

            // Adjust horizontal position if out of bounds
            if (elementLeft < calX) {
              newX += calX - elementLeft;
            } else if (elementRight > containerRight) {
              newX -= elementRight - containerRight;
            }

            // Adjust vertical position if out of bounds
            if (elementTop < calY) {
              newY += calY - elementTop;
            } else if (elementBottom > containerBottom) {
              newY -= elementBottom - containerBottom;

              // Resize row if needed
              if (elementBottom > containerBottom) {
                const newHeight = elementBottom - calY;
                this.resizeRow(targetRow.id, targetRow.y, newHeight);
              }
            }

            element.rowId = this.contentHovering.rowId;
            element.colId = this.contentHovering.colId;
            element.updateElement({
              x: newX,
              y: newY,
            });
          }
        } else {
          if (
            this.contentHovering &&
            this.contentHovering?.rowId &&
            this.contentHovering?.colId &&
            this.contentHovering?.parentRowId &&
            this.contentHovering?.parentColId &&
            ["top", "bottom"].includes(this.contentHovering?.side)
          ) {
            const row = this.getRowById(this.contentHovering.rowId);
            const column = this.getColumnInfo(
              this.contentHovering.rowId,
              this.contentHovering.colId
            );
            const parentRow = this.getRowById(this.contentHovering.parentRowId);
            const parentColumn = this.getColumnInfo(
              this.contentHovering.parentRowId,
              this.contentHovering.parentColId
            );
            if (row && column && parentRow && parentColumn) {
              if (this.contentHovering.side === "top") {
                // Check if has upper row
                const srIndex = parentColumn.subRows.findIndex(
                  sr => sr.id === row.id
                );
                if (srIndex > 0) {
                  const prevSr = parentColumn.subRows[srIndex - 1];
                  if (prevSr) {
                    // Check if any empty column in prevSr
                    const emptyColumn = prevSr.columns.find(
                      col => !this.children.find(el => el.colId === col.id)
                    );
                    if (emptyColumn) {
                      // Move element to empty column
                      element.colId = emptyColumn.id;
                      element.rowId = prevSr.id;

                      if (isLine) {
                        const lineContainer = calcWrappingLineElement(element);
                        const elementWidth = lineContainer.width;
                        const elementHeight = lineContainer.height;

                        if (elementWidth > emptyColumn.width) {
                          const scaleRatio = emptyColumn.width / elementWidth;
                          const scaledElement = scaleLineElement(
                            element,
                            scaleRatio
                          );
                          element.updateElement(scaledElement);
                        }
                        if (elementHeight > emptyColumn.height) {
                          this.resizeSubRow(prevSr.id, elementHeight);
                        }

                        // Center line element in column using its actual bounds
                        const updatedLineContainer =
                          calcWrappingLineElement(element);
                        const colCenterX =
                          parentRow.x +
                          parentColumn.x +
                          prevSr.x +
                          emptyColumn.x +
                          emptyColumn.width / 2;
                        const colCenterY =
                          parentRow.y +
                          parentColumn.y +
                          prevSr.y +
                          emptyColumn.y +
                          emptyColumn.height / 2;

                        // Adjust element position to center the line's actual bounds
                        const offsetX =
                          colCenterX -
                          (updatedLineContainer.x +
                            updatedLineContainer.width / 2);
                        const offsetY =
                          colCenterY -
                          (updatedLineContainer.y +
                            updatedLineContainer.height / 2);
                        element.x = element.x + offsetX;
                        element.y = element.y + offsetY;
                      } else {
                        if (element.width > emptyColumn.width) {
                          const scaleWidth = emptyColumn.width;
                          const scaleHeight =
                            (scaleWidth / element.width) * element.height;
                          element.width = scaleWidth;
                          element.height = scaleHeight;
                        }
                        if (element.height > emptyColumn.height) {
                          this.resizeSubRow(prevSr.id, element.height);
                        }
                        // Center element in column
                        const colX =
                          parentRow.x +
                          parentColumn.x +
                          prevSr.x +
                          emptyColumn.x +
                          emptyColumn.width / 2;
                        const colY =
                          parentRow.y +
                          parentColumn.y +
                          prevSr.y +
                          emptyColumn.y +
                          emptyColumn.height / 2;
                        element.x = colX - element.width / 2;
                        element.y = colY - element.height / 2;
                      }
                      this.contentHovering = null;
                      return element;
                    }
                  }
                }
              } else if (this.contentHovering.side === "bottom") {
                // Check if has lower row
                const srIndex = parentColumn.subRows.findIndex(
                  sr => sr.id === row.id
                );
                if (srIndex < parentColumn.subRows.length - 1) {
                  const nextSr = parentColumn.subRows[srIndex + 1];
                  if (nextSr) {
                    if (nextSr.id === element.rowId) {
                      reposition(nextSr, column, parentRow, parentColumn);
                      element.updateElement({
                        x,
                        y,
                      });
                      this.contentHovering = null;
                      return element;
                    }
                    // Check if any empty column in nextSr
                    const emptyColumn = nextSr.columns.find(
                      col => !this.children.find(el => el.colId === col.id)
                    );
                    if (emptyColumn) {
                      // Move element to empty column
                      element.colId = emptyColumn.id;
                      element.rowId = nextSr.id;
                      reposition(nextSr, emptyColumn, parentRow, parentColumn);
                      element.updateElement({
                        x,
                        y,
                      });
                      this.contentHovering = null;
                      return element;
                    }
                  }
                }
              }
            }
          }
          this.addElement(element);
        }
      }
    }
    if (
      element &&
      (element.rowId !== originalRowId || element.colId !== originalColId)
    ) {
      const originalRow = this.getRowById(originalRowId);
      if (originalRow && originalRow.rowId && originalRow.colId) {
        const hasElementsInOriginalSubCol = this.children.some(
          el => el.rowId === originalRowId && el.colId === originalColId
        );
        const hasElementsInOriginalSubRow = this.children.some(
          el => el.rowId === originalRowId
        );
        if (!hasElementsInOriginalSubCol) {
          this.deleteSubColumn(originalColId, originalRowId);
        }
        if (!hasElementsInOriginalSubRow) {
          this.deleteEmptySubRow(originalRow.colId, originalRowId);
        }
      }
    }
    this.fitElementInContainer(element);
    this.contentHovering = null;
    return element;
  };

  onElementMove = (elementId, mouseX, mouseY) => {
    const element = this.getElementById(elementId);
    if (!element) return;
    const calRow = row => {
      const startX = row.x + emailStore.offsetX;
      const calX = startX > row.x ? row.x - 16 : startX + 16;
      let rowWidth =
        this.width +
        Math.abs(emailStore.offsetX) * 2 +
        -(32 * emailStore.scale);
      if (emailStore.scale < 1) {
        rowWidth = this.width + Math.abs(calX * 2);
      } else if (emailStore.scale > 1) {
        rowWidth = this.width + Math.abs(calX * 2);
        if (emailStore.scale > 1.5 && emailStore.scale < 2) {
          rowWidth += 16;
        } else if (emailStore.scale === 2) {
          rowWidth += 24;
        } else if (emailStore.scale > 2 && emailStore.scale <= 3) {
          rowWidth += 8;
        }
      }
      return {
        x: calX,
        width: rowWidth,
        y: row.y,
        height: row.height,
      };
    };
    // Find hover row and column
    const hoverRow = this.rows.find(row => {
      const _row = calRow(row);
      const { x, y, width, height } = _row;
      return (
        mouseX >= x &&
        mouseX <= x + width &&
        mouseY >= y &&
        mouseY <= y + height
      );
    });
    if (hoverRow) {
      if (["divider", "spacer", "dashed"].includes(hoverRow.rowType)) {
        this.setHovering({ contentHovering: null });
        return;
      }
      let hoverCol = hoverRow.columns.find(col => {
        const calY = hoverRow.y + col.y;
        const calX = hoverRow.x + col.x;
        return (
          mouseX >= calX &&
          mouseX <= calX + col.width &&
          mouseY >= calY &&
          mouseY <= calY + col.height
        );
      });
      if (hoverCol && hoverCol.subRows !== undefined) {
        const hoverSubRow = hoverCol.subRows.find(subRow => {
          const calY = hoverRow.y + hoverCol.y + subRow.y;
          const calX = hoverRow.x + hoverCol.x + subRow.x;
          return (
            mouseX >= calX &&
            mouseX <= calX + subRow.width &&
            mouseY >= calY &&
            mouseY <= calY + subRow.height
          );
        });
        if (hoverSubRow) {
          const hoverSubCol = hoverSubRow.columns.find(subCol => {
            const calY = hoverRow.y + hoverCol.y + hoverSubRow.y + subCol.y;
            const calX = hoverRow.x + hoverCol.x + hoverSubRow.x + subCol.x;
            return (
              mouseX >= calX &&
              mouseX <= calX + subCol.width &&
              mouseY >= calY &&
              mouseY <= calY + subCol.height
            );
          });
          if (hoverSubCol) {
            const hasElement = this.children.find(
              el => el.rowId === hoverSubRow.id && el.colId === hoverSubCol.id
            );
            let side = "top";
            if (hasElement) {
              const calX =
                hoverSubRow.x + hoverCol.x + hoverSubCol.x + hoverRow.x;
              const calY =
                hoverSubRow.y + hoverCol.y + hoverSubCol.y + hoverRow.y;
              if (mouseX < calX + hoverSubCol.width * 0.3) {
                side = "left";
              } else if (mouseX > calX + hoverSubCol.width * 0.7) {
                side = "right";
              } else {
                side =
                  mouseY < calY + hoverSubRow.height / 2 ? "top" : "bottom";
              }
            }
            this.setHovering({
              contentHovering: {
                rowId: hoverSubRow.id,
                colId: hoverSubCol.id,
                parentRowId: hoverRow.id,
                parentColId: hoverCol.id,
                side: side,
              },
            });
            return;
          }
        }
      }
      const hasElement = this.children.some(
        e => e.colId === hoverCol?.id && e.rowId === hoverRow?.id
      );
      let side = "top";
      if (hasElement) {
        side =
          mouseY < hoverRow?.y + hoverCol?.y + hoverCol?.height / 2
            ? "top"
            : "bottom";
      }
      // if (!hoverCol && hoverRow?.columns.length > 0) {
      //   console.log(">HERE");
      //   hoverCol = hoverRow.columns[hoverRow.columns.length - 1];
      //   side = mouseY < hoverRow?.y + hoverRow?.height / 2 ? "top" : "bottom";
      // }
      this.setHovering({
        contentHovering: {
          rowId: hoverRow?.id,
          colId: hoverCol?.id,
          side,
        },
      });
    }
  };

  handleElementTransformEnd = (id, params) => {
    const redistributeColumns = (
      columns,
      expandedColumnIndex,
      maxTotalWidth,
      minColumnWidth,
      options = {},
      isKeepColumnStacked = false
    ) => {
      const PIXEL_TOLERANCE = 1;
      const { rowId, isMobileView = this.isMobileView } = options;

      const totalWidth = columns.reduce((sum, c) => sum + c.width, 0);

      if (totalWidth <= maxTotalWidth) {
        let currentX = 0;
        columns.forEach(column => {
          if (!isMobileView || isKeepColumnStacked) {
            column.x = currentX;
          }
          currentX += column.width;
        });
        return columns;
      }

      let remainingExcessWidth = totalWidth - maxTotalWidth;

      while (remainingExcessWidth > PIXEL_TOLERANCE) {
        const reducibleColumns = columns.filter(
          (column, idx) =>
            idx !== expandedColumnIndex &&
            column.width > minColumnWidth &&
            !this.checkHasElementsInColumn(column.id, rowId) // Only empty columns can be reduced
        );

        if (reducibleColumns.length === 0) {
          break;
        }
        const totalReducibleWidth = reducibleColumns.reduce(
          (sum, column) => sum + column.width,
          0
        );
        let distributedWidth = 0;
        reducibleColumns.forEach(column => {
          const reductionRatio = column.width / totalReducibleWidth;
          const reduction = Math.min(
            remainingExcessWidth * reductionRatio,
            column.width - minColumnWidth
          );

          column.width = Math.max(minColumnWidth, column.width - reduction);
          distributedWidth += reduction;
        });

        remainingExcessWidth -= distributedWidth;
        if (distributedWidth < PIXEL_TOLERANCE) {
          break;
        }
      }

      let currentX = 0;
      columns.forEach(column => {
        if (!isMobileView || isKeepColumnStacked) {
          column.x = currentX;
        }
        currentX += column.width;
        if (rowId) {
          this.children.forEach(el => {
            if (el.rowId === rowId && el.colId === column.id) {
              this.fitElementInContainer(el);
            }
          });
        }
      });

      return columns;
    };

    const element = this.getElementById(id);
    if (!element || element.groupId) return;

    if (element.elementType === ELEMENT_TEMPLATE_TYPE.SOCIAL_GROUP) {
      element.updateElement({
        x: params.x,
        y: params.y,
        width: params.width,
        height: params.height,
        rotation: params.rotation,
      });

      if (element.rotation) {
        this.fitRotatedElementInContainer(element, params.x, params.y);
      } else {
        this.fitSocialGroupElementInContainer(element);
      }

      return element;
    }
    if (element.type === ELEMENT_TEMPLATE_TYPE.GROUP) {
      const { x, y, width, height, rotation = 0 } = params;
      let scaleX = params.scaleX;
      let scaleY = params.scaleY;
      console.log("handleElementTransformEnd");

      if (element.rowId) {
        const row = this.getRowById(element.rowId);
        if (row) {
          let groupWidth = width * scaleX;
          let groupHeight = height * scaleY;
          if (groupWidth > row.width) {
            const maxScaleXGroup = row.width / width;
            scaleX = maxScaleXGroup;
            scaleY = maxScaleXGroup; // Todo if the group is transformed not keep ratio
            groupWidth = width * scaleX;
            groupHeight = height * scaleY;
          }
          const groupBottom = y + groupHeight;
          const rowBottom = row.y + row.height;

          if (groupBottom > rowBottom) {
            const expandHeight = groupBottom - row.y;
            this.resizeRow(row.id, row.y, expandHeight);
          }
        }
      }

      element.updateElement({
        x: x,
        y: y,
        rotation,
        scaleX,
        scaleY,
      });
      if (element.rotation) {
        this.fitRotatedElementInContainer(element, x, y);
      } else {
        this.fitElementInContainer(element);
      }

      return element;
    }

    // Update row and column
    const row = this.getRowById(element.rowId);
    const col = this.getColumnInfo(element.rowId, element.colId);
    const isKeepColumnStacked = row.stacking === COLUMN_STACKING.KEEP_COLUMNS;

    if (!!row && !!col) {
      let containerX, containerY, containerWidth, containerHeight;
      let parentRow, parentCol;
      const isLine =
        element.elementType === ELEMENT_TEMPLATE_TYPE.LINE ||
        element.elementType === ELEMENT_TEMPLATE_TYPE.LINE_OUTLINE;
      const isRotatedElement = !isLine && element.rotation !== 0;

      if (row.colId && row.rowId) {
        parentRow = this.getRowById(row.rowId);
        parentCol = this.getColumnInfo(row.rowId, row.colId);
        if (parentRow && parentCol) {
          containerX = parentRow.x + parentCol.x + row.x + col.x;
          containerY = parentRow.y + parentCol.y + row.y + col.y;
          containerWidth = col.width;
          containerHeight = col.height;
        }
      } else {
        containerX = row.x + col.x;
        containerY = row.y + col.y;
        containerWidth = col.width;
        containerHeight = col.height;
      }

      if (Math.round(params.width) > Math.round(containerWidth)) {
        // For elements in subRows/subCols or mobile view, scale the element instead of resizing columns
        if (this.isMobileView && !isKeepColumnStacked) {
          const scale = containerWidth / params.width;
          params.width = containerWidth;
          params.height *= scale;
          if (element.type === ELEMENT_TEMPLATE_TYPE.TEXT) {
            params.fontSize = Math.max(8, (element.fontSize || 16) * scale);
          }
        } else {
          const MIN_COL_WIDTH = 50;
          if (row.colId && row.rowId) {
            const requiredColWidth = params.width;
            const currentColWidth = col.width;
            const widthIncrease = requiredColWidth - currentColWidth;
            const oldParentColWidth = parentCol.width;

            if (widthIncrease > 0) {
              col.width = requiredColWidth;

              // Calculate max width considering only empty columns as reducible
              const colIndex = row.columns.findIndex(c => c.id === col.id);
              const otherColumnsMinWidth = row.columns
                .filter((_, idx) => idx !== colIndex)
                .reduce((sum, c) => {
                  const hasChildren = this.children.some(
                    child => child.colId === c.id && child.rowId === row.id
                  );
                  const minWidth = hasChildren ? c.width : MIN_COL_WIDTH;
                  return sum + minWidth;
                }, 0);
              const maxColWidth = this.width - otherColumnsMinWidth;
              if (col.width > maxColWidth) {
                if (params.type === ELEMENT_TEMPLATE_TYPE.IMAGE) {
                  const ratioX = params.width / maxColWidth;
                  params.cropWidth *= ratioX;
                }
                col.width = maxColWidth;
                params.width = maxColWidth;
              }

              row.columns.forEach((subCol, index) => {
                if (index > colIndex) {
                  subCol.width = Math.min(MIN_COL_WIDTH, subCol.width);
                  subCol.x =
                    index === 0
                      ? 0
                      : row.columns[index - 1].x + row.columns[index - 1].width;
                  this.children.forEach(el => {
                    if (el.rowId === row.id && el.colId === subCol.id) {
                      this.fitElementInContainer(el);
                    }
                  });
                }
              });

              row.width = row.columns.reduce((sum, c) => sum + c.width, 0);
              parentCol.width = Math.max(parentCol.width, row.width);

              parentCol.subRows?.forEach(subRow => {
                if (subRow.id !== row.id) {
                  const oldSubRowWidth = subRow.width;
                  subRow.width = parentCol.width;

                  subRow.columns.forEach((subCol, index) => {
                    const widthPercentage = subCol.width / oldSubRowWidth;
                    subCol.width = parentCol.width * widthPercentage;
                    subCol.x =
                      index === 0
                        ? 0
                        : subRow.columns[index - 1].x +
                        subRow.columns[index - 1].width;

                    this.children.forEach(el => {
                      if (el.rowId === subRow.id && el.colId === subCol.id) {
                        this.fitElementInContainer(el);
                      }
                    });
                  });
                }
              });
            }

            const actualParentColIncrease = parentCol.width - oldParentColWidth;

            // Distribute expansion across all other parent columns
            if (actualParentColIncrease > 0) {
              const parentColIndex = parentRow.columns.findIndex(
                c => c.id === parentCol.id
              );

              if (parentColIndex > -1 && parentRow.columns.length > 1) {
                const otherColumns = parentRow.columns.filter(
                  (_, idx) => idx !== parentColIndex
                );
                const totalOtherWidth = otherColumns.reduce(
                  (sum, c) => sum + c.width,
                  0
                );

                if (totalOtherWidth > 0) {
                  const totalRowWidth = parentRow.columns.reduce(
                    (sum, c) => sum + c.width,
                    0
                  );

                  if (totalRowWidth > this.width) {
                    const excessWidth = totalRowWidth - this.width;
                    let currentX = 0;
                    parentRow.columns.forEach((currentCol, idx) => {
                      currentCol.x = currentX;

                      if (idx !== parentColIndex) {
                        const reductionRatio =
                          currentCol.width / totalOtherWidth;
                        const reduction = excessWidth * reductionRatio;
                        currentCol.width = Math.max(
                          MIN_COL_WIDTH,
                          currentCol.width - reduction
                        );
                      }

                      currentX += currentCol.width;

                      // Update subRows if they exist
                      if (currentCol.subRows) {
                        currentCol.subRows.forEach(subRow => {
                          const oldSubRowWidth = subRow.width;
                          subRow.width = currentCol.width;

                          subRow.columns.forEach((subCol, subIndex) => {
                            const widthPercentage =
                              subCol.width / oldSubRowWidth;
                            subCol.width = currentCol.width * widthPercentage;
                            subCol.x =
                              subIndex === 0
                                ? 0
                                : subRow.columns[subIndex - 1].x +
                                subRow.columns[subIndex - 1].width;

                            // Update elements in this subColumn
                            this.children.forEach(el => {
                              if (
                                el.rowId === subRow.id &&
                                el.colId === subCol.id
                              ) {
                                this.fitElementInContainer(el);
                              }
                            });
                          });
                        });
                      } else {
                        // Update elements in regular column
                        this.children.forEach(el => {
                          if (
                            el.rowId === parentRow.id &&
                            el.colId === currentCol.id
                          ) {
                            const absoluteX = parentRow.x + currentCol.x;

                            if (el.x < absoluteX) {
                              el.x = absoluteX;
                            } else if (
                              el.x + el.width >
                              absoluteX + currentCol.width
                            ) {
                              el.x = absoluteX + currentCol.width - el.width;
                            }

                            // Scale down element if needed
                            if (el.width > currentCol.width) {
                              const scaleWidth = currentCol.width;
                              const scaleHeight =
                                (scaleWidth / el.width) * el.height;
                              el.width = scaleWidth;
                              el.height = scaleHeight;

                              // Center element in column after scaling
                              el.x =
                                absoluteX + (currentCol.width - el.width) / 2;
                            }
                          }
                        });
                      }
                    });
                  }
                }
              }
            }
          } else {
            // Regular column expansion logic (existing code)
            const offset = params.width - col.width;
            col.width = Math.min(params.width, this.width);
            // Calculate max width considering only empty columns as reducible
            const colIndex = row.columns.findIndex(c => c.id === col.id);
            const otherColumnsMinWidth = row.columns
              .filter((_, idx) => idx !== colIndex)
              .reduce((sum, c) => {
                const hasChildren = this.checkHasElementsInColumn(c.id, row.id);
                const minWidth = hasChildren ? c.width : MIN_COL_WIDTH;
                return sum + minWidth;
              }, 0);
            const maxColWidth = this.width - otherColumnsMinWidth;
            if (col.width > maxColWidth) {
              if (element.type === ELEMENT_TEMPLATE_TYPE.IMAGE) {
                const ratioX = maxColWidth / params.width;
                params.cropWidth *= ratioX;
              }
              col.width = maxColWidth;
              params.width = maxColWidth;
            }

            if (offset > 0 && row.columns.length > 1) {
              const otherColumns = row.columns.filter(
                (_, idx) => idx !== colIndex
              );
              const totalOtherWidth = otherColumns.reduce(
                (sum, c) => sum + c.width,
                0
              );

              if (totalOtherWidth > 0) {
                // Calculate total row width after current column resize
                const totalRowWidth = row.columns.reduce(
                  (sum, c, idx) =>
                    idx === colIndex ? sum + col.width : sum + c.width,
                  0
                );

                if (totalRowWidth > this.width) {
                  redistributeColumns(
                    row.columns,
                    colIndex,
                    this.width,
                    MIN_COL_WIDTH,
                    { rowId: row.id },
                    isKeepColumnStacked
                  );

                  // Adjust all columns proportionally
                  row.columns.forEach(column => {
                    if (column.subRows && column.subRows.length > 0) {
                      column.subRows.forEach(subRow => {
                        const oldSubRowWidth = subRow.width;
                        subRow.width = column.width;
                        let subCurrentX = 0;

                        subRow.columns.forEach(subCol => {
                          const widthPercentage = subCol.width / oldSubRowWidth;
                          subCol.width = column.width * widthPercentage;

                          subCol.x = subCurrentX;
                          subCurrentX += subCol.width;

                          this.children.forEach(el => {
                            if (
                              el.rowId === subRow.id &&
                              el.colId === subCol.id
                            ) {
                              this.fitElementInContainer(el);
                            }
                          });
                        });
                      });
                    }
                  });
                }
              }
            }
          }
        }
      }

      let yBtmOffset = 0;
      if (
        element.type === ELEMENT_TEMPLATE_TYPE.TEXT &&
        element.elementType !== ELEMENT_TEMPLATE_TYPE.CTA &&
        element.elementType !== ELEMENT_TEMPLATE_TYPE.LINK
      ) {
        const _offset =
          containerY +
          containerHeight -
          (params.originalY + params.originalHeight);
        if (_offset > 0) {
          yBtmOffset = _offset;
        }
      }

      if (params.height > containerHeight) {
        if (this.isMobileView && !isKeepColumnStacked) {
          if (row.colId && row.rowId) {
            if (params.height > row.height) {
              this.resizeSubRow(row.id, params.height);
            }
          } else {
            // set selected row and column
            this.setSelected(row.id, "selectedRowId", false);
            this.setSelected(col.id, "selectedColId", false);
            this.resizeColumnHeight(params.height);
          }
        } else {
          // Desktop: Expand container
          if (row.colId && row.rowId) {
            this.resizeSubRow(row.id, params.height);
          } else {
            if (isRotatedElement) {
              const rotatedWrapper = calcWrappingRotatedElement(element, {
                x: element.x,
                y: element.y,
              });
              this.resizeRow(row.id, row.y, rotatedWrapper.bboxHeight);
            } else {
              this.resizeRow(row.id, row.y, params.height);
            }
          }
        }
      } else if (element.type === ELEMENT_TEMPLATE_TYPE.TEXT) {
        const isCtaOrLink =
          element.elementType === ELEMENT_TEMPLATE_TYPE.CTA ||
          element.elementType === ELEMENT_TEMPLATE_TYPE.LINK;

        const { height: newTextHeight } = calTextHeight(
          {
            ...element,
            ...params,
          },
          { width: isCtaOrLink ? col.width : element.width }
        );
        if (newTextHeight > containerHeight) {
          const heightOffset =
            element.y -
            containerY +
            (containerHeight + containerY - element.height - element.y);
          const isSubRow = row.rowId && row.colId;
          const isSingleRow = row.columns.length === 1;

          if (isSubRow) {
            this.resizeSubRow(row.id, newTextHeight + heightOffset);
          } else if (isSingleRow) {
            this.setSelected(col.id, "selectedColId", false);
            this.setSelected(row.id, "selectedRowId", false);
            this.resizeColumnHeight(newTextHeight + heightOffset);
            this.setSelected(null, "selectedColId", false);
            this.setSelected(null, "selectedRowId", false);
          } else {
            this.resizeRow(row.id, row.y, newTextHeight + heightOffset);
          }
        }
      }

      // Recalculate container bounds after expansion
      if (row.colId && row.rowId) {
        const updatedParentRow = this.getRowById(row.rowId);
        const updatedParentCol = this.getColumnInfo(row.rowId, row.colId);
        const updatedRow = this.getRowById(element.rowId);
        const updatedCol = this.getColumnInfo(element.rowId, element.colId);

        if (updatedParentRow && updatedParentCol && updatedRow && updatedCol) {
          containerX =
            updatedParentRow.x +
            updatedParentCol.x +
            updatedRow.x +
            updatedCol.x;
          containerY =
            updatedParentRow.y +
            updatedParentCol.y +
            updatedRow.y +
            updatedCol.y;
          containerWidth = updatedCol.width;
          containerHeight = updatedCol.height;
        }
      } else {
        const updatedRow = this.getRowById(element.rowId);
        const updatedCol = this.getColumnInfo(element.rowId, element.colId);

        if (updatedRow && updatedCol) {
          containerX = updatedRow.x + updatedCol.x;
          containerY = updatedRow.y + updatedCol.y;
          containerWidth = updatedCol.width;
          containerHeight = updatedCol.height;
        }
      }

      if (element.rotation) {
        element.updateElement(toJS(params));
        this.fitRotatedElementInContainer(element, params.x, params.y);
      } else if (isLine) {
        element.updateElement(toJS(params));
        this.fitLineElementInContainer(element);
      } else {
        if (params.x < containerX) {
          params.x = containerX;
        }
        if (params.y < containerY) {
          params.y = containerY;
        }
        if (params.x + params.width > containerX + containerWidth) {
          params.x = containerX + containerWidth - params.width;
        }
        if (params.y + params.height > containerY + containerHeight) {
          params.y = containerY + containerHeight - params.height;
        }
        element.updateElement(toJS(params));
        this.fitElementInContainer(element, yBtmOffset);
      }
    }
    return element;
  };

  handleReplaceText = (data, elementId) => {
    const language = data?.language || "English";
    const element = this.getElementById(elementId);
    const elements = this.children.filter(
      e => e.rowId === element?.rowId && e.colId === element?.colId
    );
    for (const childElement of elements) {
      const col = this.getColumnInfo(childElement.rowId, childElement.colId);
      switch (childElement.elementType) {
        case ELEMENT_TEMPLATE_TYPE.HEADLINE:
        case ELEMENT_TEMPLATE_TYPE.HEADING1: {
          if (data.isHeadline && data?.headline && data?.headline !== "") {
            const text = data?.headline;
            childElement.updateElement({
              text,
              language,
              valueList: [{ ...childElement.valueList[0], text }],
            });
            childElement.resetKeyframeAnimation();
          }
          break;
        }
        case ELEMENT_TEMPLATE_TYPE.SUBHEAD:
        case ELEMENT_TEMPLATE_TYPE.HEADING2:
        case ELEMENT_TEMPLATE_TYPE.HEADING3: {
          if (data.isSubhead && data?.subhead && data?.subhead !== "") {
            const text = data?.subhead;
            childElement.updateElement({
              text,
              language,
              valueList: [{ ...childElement.valueList[0], text }],
            });
            childElement.resetKeyframeAnimation();
          }
          break;
        }
        case ELEMENT_TEMPLATE_TYPE.CUSTOM_TEXT:
        case ELEMENT_TEMPLATE_TYPE.BODY:
        case ELEMENT_TEMPLATE_TYPE.MULTI_TEXT: {
          if (data.isBody && data?.body && data?.body !== "") {
            const text = data?.body;
            childElement.updateElement({
              text,
              language,
              valueList: [{ ...childElement.valueList[0], text }],
            });
            childElement.resetKeyframeAnimation();
          }
          break;
        }
        case ELEMENT_TEMPLATE_TYPE.CTA:
        case ELEMENT_TEMPLATE_TYPE.LINK:
        case BUTTON_TYPES.LINK:
        case BUTTON_TYPES.PRIMARY: {
          if (data.isCta && data?.cta && data?.cta !== "") {
            const text = data?.cta;
            childElement.updateElement({
              text,
              language,
              valueList: [{ ...childElement.valueList[0], text }],
            });
            childElement.resetKeyframeAnimation();
          }
          break;
        }
        default:
          break;
      }
      this.updateTextHeight(childElement);
      const row = this.getRowById(childElement.rowId);
      if (row && col) {
        let containerX = row.x + col.x;
        let containerY = row.y + col.y;
        let containerWidth = col.width;
        let containerHeight = col.height;
        if (row.rowId && row.colId) {
          const parentRow = this.getRowById(row.rowId);
          const parentCol = this.getColumnInfo(row.rowId, row.colId);
          if (parentRow && parentCol) {
            containerX += parentRow.x + parentCol.x;
            containerY += parentRow.y + parentCol.y;
          }
        }
        if (childElement.x < containerX) {
          childElement.x = containerX;
        }
        if (childElement.y < containerY) {
          childElement.y = containerY;
        }
        if (childElement.x + childElement.width > containerX + containerWidth) {
          childElement.x = containerX + containerWidth - childElement.width;
        }
        const { height } = calTextHeight(childElement, childElement);
        if (childElement.y + height > containerY + containerHeight) {
          childElement.y = containerY + containerHeight - height;
        }
      }
    }
    emailStore.updateEditorStore({ keyframeAnimationFocus: false });
  };

  updateTextHeight = (element, newHeight) => {
    if (!element) {
      return;
    }
    if (typeof element === "string") {
      element = this.getElementById(element);
    }
    if (element.groupId) return;
    // Ensure we have valid height
    const { height } = calTextHeight(element, element);
    const updatedHeight = newHeight || height;
    const row = this.getRowById(element.rowId);
    const col = this.getColumnInfo(element.rowId, element.colId);
    if (row && col) {
      const containerHeight = col?.height;
      if (updatedHeight > containerHeight) {
        element.updateElement({
          height: updatedHeight,
        });
        if (row.rowId && row.colId) {
          this.resizeSubRow(row.id, updatedHeight + 10);
        } else {
          if (this.isMobileView) {
            this.setSelected(row.id, "selectedRowId", false);
            this.setSelected(col.id, "selectedColId", false);
            this.resizeColumnHeight(updatedHeight);
            this.setSelected(element, "selectedElementIds");
          } else {
            const offset = updatedHeight - containerHeight;
            this.resizeRow(row.id, row.y, row.height + offset);
          }
        }
      }
      const _row = this.getRowById(element.rowId);
      const _col = this.getColumnInfo(element.rowId, element.colId);
      let containerX = _row.x + _col.x;
      let containerY = _row.y + _col.y;
      if (_row.rowId && _row.colId) {
        const parentRow = this.getRowById(_row.rowId);
        const parentCol = this.getColumnInfo(_row.rowId, _row.colId);
        if (parentRow && parentCol) {
          containerX += parentRow.x + parentCol.x;
          containerY += parentRow.y + parentCol.y;
        }
      }
      if (element.y < containerY) {
        element.y = containerY;
      }
      if (element.y + updatedHeight > containerY + _col.height) {
        element.y = containerY + _col.height - updatedHeight;
      }
      if (element.x < containerX) {
        element.x = containerX;
      }
      if (element.x + element.width > containerX + _col.width) {
        element.x = containerX + _col.width - element.width;
      }
    }
  };

  onChangeRowColor = (rowId, color) => {
    const row = this.rows.find(r => r.id === rowId);
    if (row) {
      row.background = color;
      row.backgroundGradient = null;
    } else {
      this.background = color;
      this.backgroundGradient = null;
      this.rows.forEach(r => {
        r.background = color;
        r.backgroundGradient = null;
      });
    }

    this.rows.forEach(r => {
      if (r.originalBackground !== undefined) {
        delete r.originalBackground;
      }
      if (r.originalBackgroundGradient !== undefined) {
        delete r.originalBackgroundGradient;
      }
    });

    const otherViewPage = this.findOtherViewPage();
    if (otherViewPage) {
      syncBackgroundBetweenViews(this, otherViewPage);
      otherViewPage.rows.forEach(r => {
        if (r.originalBackground !== undefined) {
          delete r.originalBackground;
        }
        if (r.originalBackgroundGradient !== undefined) {
          delete r.originalBackgroundGradient;
        }
      });
    }
  };

  applyHover = (rows, color) => {
    rows.forEach(row => {
      if (color) {
        if (row.originalBackground === undefined) {
          row.originalBackground = row.background;
        }
        if (row.originalBackgroundGradient === undefined) {
          row.originalBackgroundGradient = row.backgroundGradient;
        }
        row.background = color;
        row.backgroundGradient = null;
      } else if (
        row.originalBackground !== undefined ||
        row.originalBackgroundGradient !== undefined
      ) {
        // Restore original background
        if (row.originalBackground !== undefined) {
          row.background = row.originalBackground;
          delete row.originalBackground;
        }
        // Restore original backgroundGradient
        if (row.originalBackgroundGradient !== undefined) {
          row.backgroundGradient = row.originalBackgroundGradient;
          delete row.originalBackgroundGradient;
        }
      }
    });
  };

  updateRowAttrs = (rowId, attrs) => {
    const row = this.getRowById(rowId);
    if (row) {
      Object.keys(attrs).forEach(key => {
        if (key in row) {
          row[key] = attrs[key];
        }
      });
    }
  };

  onChangeRowGradient = (rowId, gradient) => {
    if (rowId === null) {
      if (!gradient) {
        this.backgroundGradient = null;
        this.background = "#ffffff";
        this.rows.forEach(r => {
          r.backgroundGradient = null;
          r.background = "#ffffff";
        });
        return;
      }

      this.backgroundGradient = {
        ...gradient,
        isFill: true,
        opacity: gradient?.opacity ?? this.backgroundGradient?.opacity ?? 0.5,
        rotation: gradient?.rotation ?? this.backgroundGradient?.rotation ?? 0,
      };
      this.background = "#ffffff"; // Clear page background

      this.rows.forEach(r => {
        r.backgroundGradient = {
          ...gradient,
          isFill: true,
          opacity: gradient?.opacity ?? r.backgroundGradient?.opacity ?? 0.5,
          rotation: gradient?.rotation ?? r.backgroundGradient?.rotation ?? 0,
        };
        r.background = null; // Clear all row backgrounds
      });
    } else {
      // Logic for specific rowId
      const row = this.rows.find(r => r.id === rowId);
      if (row) {
        if (!gradient) {
          row.backgroundGradient = null;
          row.background = "#ffffff";
          return;
        }

        row.backgroundGradient = {
          ...gradient,
          isFill: true,
          opacity: gradient?.opacity ?? this.backgroundGradient?.opacity ?? 0.5,
          rotation:
            gradient?.rotation ?? this.backgroundGradient?.rotation ?? 0,
        };
        row.background = null;
      } else {
        // Fallback: if no row found, apply to all rows
        this.backgroundGradient = {
          ...gradient,
          isFill: true,
          opacity: gradient?.opacity ?? this.backgroundGradient?.opacity ?? 0.5,
          rotation:
            gradient?.rotation ?? this.backgroundGradient?.rotation ?? 0,
        };
        this.background = "#ffffff"; // Clear page background
        this.rows.forEach(r => {
          r.backgroundGradient = {
            ...gradient,
            isFill: true,
            opacity: gradient?.opacity ?? r.backgroundGradient?.opacity ?? 0.5,
            rotation: gradient?.rotation ?? r.backgroundGradient?.rotation ?? 0,
          };
          r.background = null; // Clear all row backgrounds
        });
      }
    }

    this.rows.forEach(r => {
      if (r.originalBackgroundGradient !== undefined) {
        delete r.originalBackgroundGradient;
      }
      if (r.originalBackground !== undefined) {
        delete r.originalBackground;
      }
    });

    const otherViewPage = this.findOtherViewPage();
    if (otherViewPage) {
      syncBackgroundGradientBetweenViews(this, otherViewPage);
      otherViewPage.rows.forEach(r => {
        if (r.originalBackgroundGradient !== undefined) {
          delete r.originalBackgroundGradient;
        }
        if (r.originalBackground !== undefined) {
          delete r.originalBackground;
        }
      });
    }
  };

  updateRowHyperlink = (rowId, hyperlink) => {
    const row = this.getRowById(rowId);
    if (row) {
      row.hyperlink = hyperlink;
    }
  };

  findOtherViewPage = () => {
    return emailStore.pages.find(
      page =>
        page.id !== this.id &&
        (page.parentId === this.parentId ||
          page.parentId === this.id ||
          this.parentId === page.id)
    );
  };

  onHoverRowColor = color => {
    if (color) {
      this.applyHover(this.rows, color);
      const otherViewPage = this.findOtherViewPage();
      if (otherViewPage) {
        this.applyHover(otherViewPage.rows, color);
      }
    } else {
      this.applyHover(this.rows, null);
      const otherViewPage = this.findOtherViewPage();
      if (otherViewPage) {
        otherViewPage.rows.forEach(row => {
          if (
            row.originalBackground !== undefined ||
            row.originalBackgroundGradient !== undefined
          ) {
            // Restore original background
            if (row.originalBackground !== undefined) {
              row.background = row.originalBackground;
              delete row.originalBackground;
            }
            // Restore original backgroundGradient
            if (row.originalBackgroundGradient !== undefined) {
              row.backgroundGradient = row.originalBackgroundGradient;
              delete row.originalBackgroundGradient;
            }
          }
        });
      }
    }
  };

  updateWidth = (width, rows) => {
    this.rows
      .filter(row => !rows || rows.map(r => r.id).includes(row.id))
      .forEach(row => {
        const currentWidth = rows
          ? row.width || row.columns.reduce((acc, col) => acc + col.width, 0)
          : this.width;
        row.width = width;
        row.columns.forEach((col, i) => {
          const widthPercent = (col.width / currentWidth) * 100;
          const oldColWidth = col.width;
          const oldColX = col.x;
          col.width = this.isMobileView ? width : (widthPercent * width) / 100;
          if (i > 0) {
            const prevCol = row.columns[i - 1];
            col.x = this.isMobileView ? 0 : prevCol.x + prevCol.width;
          }
          if (col.subRows) {
            col.subRows.forEach(subRow => {
              subRow.width = col.width;
              subRow.x = 0;
              subRow.columns.forEach((subCol, j) => {
                const subWidthPercent = (subCol.width / oldColWidth) * 100;
                const oldSubColWidth = subCol.width;
                const oldSubColX = subCol.x;
                subCol.width = (subWidthPercent * col.width) / 100;
                if (j > 0) {
                  const prevSubCol = subRow.columns[j - 1];
                  subCol.x = prevSubCol.x + prevSubCol.width;
                } else {
                  subCol.x = 0;
                }
                this.children.forEach(el => {
                  if (el.rowId === subRow.id && el.colId === subCol.id) {
                    const elOffsetX =
                      subCol.x -
                      oldSubColX +
                      (subCol.width - oldSubColWidth) / 2;
                    el.x += elOffsetX;
                    this.fitElementInContainer(el);
                  }
                });
              });
            });
          } else {
            this.children.forEach(el => {
              if (el.rowId === row.id && el.colId === col.id) {
                const elOffsetX =
                  col.x - oldColX + (col.width - oldColWidth) / 2;
                el.x += elOffsetX;
                this.fitElementInContainer(el);
              }
            });
          }
        });
      });
    this.width = width;
  };

  addHistoryList = childrenList => {
    const value = this.storeValue;

    const childList = [...childrenList];

    const lastChild = childList?.pop();
    if (lastChild) {
      emailEditorHistory.updateState({
        ...value,
        children: value?.children?.map(children => {
          if (children?.id !== lastChild?.id) return children;

          return { ...children, valueList: lastChild?.valueList };
        }),
      });
    }

    childList?.map(child => {
      emailEditorHistory.updateStateWithoutSave({
        ...value,
        children: value?.children?.map(children => {
          if (children?.id !== child?.id) return children;

          return { ...children, valueList: child?.valueList };
        }),
      });
    });
  };

  appendHistoryList = childrenList => {
    const value = this.storeValue;

    childrenList?.map(child =>
      emailEditorHistory.appendState({
        ...value,
        children: value?.children?.map(children => {
          if (children?.id !== child?.id) return children;

          return { ...children, valueList: child?.valueList };
        }),
      })
    );
  };

  undo = () => {
    if (this.availableUndo && !this.pendingPageChange) {
      const updatedState = emailEditorHistory.undo(this.id);
      emailStore.isRedoOrUndo = true;
      this.setPage({
        ...updatedState,
        children: updatedState?.children?.map(child => ({
          ...child,
          loaded: true,
        })),
      });
      this.syncCanvasHeight();
      this.clearSelected();
    } else {
      console.warn("Nothing to undo");
    }
  };

  redo = () => {
    if (this.availableRedo && !this.pendingPageChange) {
      const updatedState = emailEditorHistory.redo(this.id);
      emailStore.isRedoOrUndo = true;
      this.setPage({
        ...updatedState,
        children: updatedState?.children?.map(child => ({
          ...child,
          loaded: true,
        })),
      });
      this.syncCanvasHeight();
      this.clearSelected();
    } else {
      console.warn("Nothing to redo");
    }
  };

  pasteCopiedElements = (copiedElements = [], onSuccess = () => { }) => {
    if (copiedElements.length > 0) {
      const selectedElementIds = this.selectedElementIds;
      const selectedRowId = this.selectedRowId;
      const selectedColId = this.selectedColId;
      const col = this.getColumnInfo(selectedRowId, selectedColId);
      if (col?.subRows?.length > 0) {
        promiseToastStateStore.createToast({
          label: "Cannot paste into column that already has element",
        });
        return;
      }

      const copiedIds = [];
      this.clearSelected();
      copiedElements
        .sort((a, b) => a.index - b.index)
        .forEach(element => {
          let rowId = null;
          let colId = null;
          const offsetX = element.x;
          let offsetY = 0;
          const elRow = this.getRowById(element.rowId);
          if (elRow) {
            if (elRow.rowId) {
              const parentRow = this.getRowById(elRow.rowId);
              if (parentRow) {
                offsetY = element.y - parentRow.y;
              }
            } else {
              offsetY = element.y - elRow.y;
            }
          }

          if (selectedRowId) {
            rowId = selectedRowId;
            colId = selectedColId;
          } else if (selectedElementIds.length > 0) {
            const el = this.getElementById(selectedElementIds[0]);
            if (el) {
              const row = this.getRowById(el.rowId);
              if (row) {
                if (row.rowId) {
                  rowId = row.rowId;
                } else {
                  rowId = row.id;
                }
                colId = el.colId;
              }
            }
          }

          const targetRow = rowId ? this.getRowById(rowId) : null;
          const targetCol =
            colId && targetRow ? this.getColumnInfo(rowId, colId) : null;

          let isDividerElement =
            element.elementType === ELEMENT_TEMPLATE_TYPE.DIVIDER ||
            element.elementType === ELEMENT_TEMPLATE_TYPE.DASHED;

          if (isDividerElement) {
            if (targetRow?.rowType === "free-blocks") {
              promiseToastStateStore.createToast({
                label: "Cannot paste divider into Free-Form",
              });
              return;
            }

            this.blockHovering = {
              rowId: rowId,
              side: "bottom",
            };

            const row = this.addBlock(
              {
                type: "blocks",
                sizes: [100],
              },
              !!rowId,
              "divider"
            );
            const col = row.columns[0];
            if (row && col) {
              this.contentHovering = {
                rowId: row.id,
                colId: col.id,
                side: "bottom",
              };
              const newElementId = uuidv4();

              let x = offsetX;
              let y = row.y + offsetY;
              const minX = col.x;
              const maxX = col.x + col.width - element.width;
              const minY = row.y + col.y;
              const maxY = row.y + col.y + col.height - element.height;
              x = Math.max(minX, Math.min(x, maxX));
              y = Math.max(minY, Math.min(y, maxY));
              const newElement = new Element({
                ...element,
                loaded: false,
                id: newElementId,
                x,
                y,
                index: this.children.length,
                rowId: row.id,
                colId: col.id,
              });
              this.children.push(newElement);
              copiedIds.push(newElementId);

              const requiredHeight = newElement.height + 20;
              if (row.height < requiredHeight) {
                this.resizeRow(row.id, row.y, requiredHeight);
                newElement.y = row.y + 10;
              }
              this.clearHovering();
            }
            return;
          }

          if (
            !element.groupId &&
            element.elementType !== ELEMENT_TEMPLATE_TYPE.GROUP &&
            element.elementType !== ELEMENT_TEMPLATE_TYPE.SOCIAL_GROUP
          ) {
            if (targetRow?.rowType === "free-blocks") {
              const col = targetRow.columns[0];
              if (targetRow && col) {
                const newElementId = uuidv4();

                let x = offsetX + 20;
                let y = targetRow.y + offsetY + 20;
                const minX = col.x;
                const maxX = col.x + col.width - element.width;
                const minY = targetRow.y;
                const maxY = targetRow.y + targetRow.height - element.height;
                x = Math.max(minX, Math.min(x, maxX));
                y = Math.max(minY, Math.min(y, maxY));

                const newElement = new Element({
                  ...element,
                  loaded: false,
                  id: newElementId,
                  x,
                  y,
                  index: this.children.length,
                  rowId: targetRow.id,
                  colId: col.id,
                });
                this.children.push(newElement);
                copiedIds.push(newElementId);

                this.fitElementInContainer(newElement);

                const requiredHeight = newElement.height + 20;
                if (targetRow.height < requiredHeight) {
                  this.resizeRow(targetRow.id, targetRow.y, requiredHeight);
                  newElement.y = targetRow.y + 20;
                }
              }
            } else if (targetRow && targetCol) {
              const existingElement = this.getElementByRowCol(rowId, colId);
              if (existingElement) {
                promiseToastStateStore.createToast({
                  label: "Cannot paste into column that already has element",
                });
                return;
              }

              const newElementId = uuidv4();
              let x = offsetX;
              let y = targetRow.y + offsetY;
              const minX = targetCol.x;
              const maxX = targetCol.x + targetCol.width - element.width;
              const minY = targetRow.y + targetCol.y;
              const maxY =
                targetRow.y + targetCol.y + targetCol.height - element.height;
              x = Math.max(minX, Math.min(x, maxX));
              y = Math.max(minY, Math.min(y, maxY));

              const newElement = new Element({
                ...element,
                loaded: false,
                id: newElementId,
                x,
                y,
                index: this.children.length,
                rowId: rowId,
                colId: colId,
                disableSync: false,
              });
              this.children.push(newElement);
              copiedIds.push(newElementId);

              if (targetRow.height < newElement.height) {
                this.resizeRow(targetRow.id, targetRow.y, newElement.height);
              }

              this.fitElementInContainer(newElement);
            } else {
              promiseToastStateStore.createToast({
                label: "Please select a column to paste",
              });
              return;
            }
          } else if (element.elementType === ELEMENT_TEMPLATE_TYPE.GROUP) {
            let row = targetRow;

            if (!row) {
              promiseToastStateStore.createToast({
                label: "Please select a row to paste group",
              });
              return;
            }

            if (row.rowType !== "free-blocks") {
              promiseToastStateStore.createToast({
                label: "Cannot paste group into regular row or column",
              });
              return;
            }

            const col = row.columns[0];

            if (row.rowType !== "free-blocks") {
              const existingElement = this.getElementByRowCol(row.id, col.id);
              if (existingElement) {
                promiseToastStateStore.createToast({
                  label:
                    "Cannot paste group into column that already has element",
                });
                return;
              }
            }

            const groupElementIds = [];
            const groupId = uuidv4();

            // Create children elements in the group
            copiedElements
              .filter(child => child.groupId === element.id)
              .forEach(child => {
                const id = uuidv4();
                const newElement = new Element({
                  ...child,
                  id,
                  loaded: false,
                  image: child.image,
                  // Don't modify x,y of group children - maintain original relative position
                  x: child.x,
                  y: child.y,
                  groupId,
                  isNew: true,
                  rowId: row.id,
                  colId: col.id,
                });

                this.children.push(newElement);
                groupElementIds.push(id);
              });
            let x = offsetX + (row.rowType === "free-blocks" ? 20 : 0);
            let y = row.y + offsetY + (row.rowType === "free-blocks" ? 20 : 0);
            const minX = col.x;
            const maxX = col.x + col.width - element.width;
            const minY = row.y + col.y;
            const maxY = row.y + col.y + col.height - element.height;
            x = Math.max(minX, Math.min(x, maxX));
            y = Math.max(minY, Math.min(y, maxY));

            // Only move the group element itself
            const newGroupElement = new GroupElementStore({
              ...element,
              name: `${element.name} copy`,
              id: groupId,
              elementIds: groupElementIds,
              x,
              y,
              pageId: this.id,
              isNew: true,
              rowId: row.id,
              colId: col.id,
            });

            this.children.push(newGroupElement);
            copiedIds.push(groupId);

            const groupWidth = newGroupElement.width * newGroupElement.scaleX;
            const containerWidth = col.width;

            if (groupWidth > containerWidth) {
              // Calculate required width for the group
              const requiredWidth = groupWidth + 40; // Add some padding

              // Check if we can resize the column
              const maxPossibleWidth = this.width - 40; // Leave some margin

              if (requiredWidth <= maxPossibleWidth) {
                // Resize the column to accommodate the group
                this.resizeColumnWidth(row.id, col.id, requiredWidth);
              } else {
                // If group is too large, scale it down to fit
                const scale = containerWidth / groupWidth;
                newGroupElement.scaleX = scale;
                newGroupElement.scaleY = scale;
              }
            }

            const requiredHeight = newGroupElement.height + 20;
            if (row.height < requiredHeight) {
              this.resizeRow(row.id, row.y, requiredHeight);
              newGroupElement.y = row.y + 10;
            }
            this.fitElementInContainer(newGroupElement);
            this.clearHovering();
          } else if (
            element.elementType === ELEMENT_TEMPLATE_TYPE.SOCIAL_GROUP
          ) {
            let row = targetRow;
            let col = targetCol;

            if (!row) {
              promiseToastStateStore.createToast({
                label: "Please select a row to paste social group",
              });
              return;
            }

            if (!col) {
              col = row.columns?.[0];
              if (!col) {
                promiseToastStateStore.createToast({
                  label: "Please select a column to paste social group",
                });
                return;
              }
            }

            if (row.rowType !== "free-blocks") {
              const existingElement = this.getElementByRowCol(row.id, col.id);
              if (existingElement) {
                promiseToastStateStore.createToast({
                  label:
                    "Cannot paste social group into column that already has element",
                });
                return;
              }
            }

            const groupElementIds = [];
            const groupId = uuidv4();

            // Create children elements in the social group
            copiedElements
              .filter(child => child.groupId === element.id)
              .forEach(child => {
                const id = uuidv4();
                const newElement = new Element({
                  ...child,
                  id,
                  loaded: false,
                  image: child.image,
                  // Maintain original relative position within the group
                  x: child.x,
                  y: child.y,
                  groupId,
                  isNew: true,
                  rowId: row.id,
                  colId: col.id,
                });

                this.children.push(newElement);
                groupElementIds.push(id);
              });

            // Calculate position for the social group
            let x = offsetX;
            let y = row.y + offsetY;

            if (row.rowType === "free-blocks") {
              x = offsetX + 20;
              y = row.y + offsetY + 20;
            }

            const minX = col.x;
            const maxX = col.x + col.width - element.width;
            const minY = row.y + col.y;
            const maxY = row.y + col.y + col.height - element.height;
            x = Math.max(minX, Math.min(x, maxX));
            y = Math.max(minY, Math.min(y, maxY));

            // Create the new social group element
            const newSocialGroupElement = new GroupElementStore({
              ...element,
              name: `${element.name} copy`,
              id: groupId,
              elementIds: groupElementIds,
              elementType: ELEMENT_TEMPLATE_TYPE.SOCIAL_GROUP,
              x,
              y,
              width: element.width,
              height: element.height,
              pageId: this.id,
              isNew: true,
              rowId: row.id,
              colId: col.id,
            });

            this.children.push(newSocialGroupElement);
            copiedIds.push(groupId);

            // Resize row if needed to accommodate the social group
            const requiredHeight = newSocialGroupElement.height + 20;
            if (row.height < requiredHeight) {
              this.resizeRow(row.id, row.y, requiredHeight);
              newSocialGroupElement.y = row.y + 10;
            }

            this.fitSocialGroupElementInContainer(newSocialGroupElement);
            this.clearHovering();
          }
        });
      if (copiedIds.length > 0) {
        onSuccess?.();
      }
    }
  };

  pasteCutElements = async (copiedElements = []) => {
    this.pasteCopiedElements(copiedElements, () => clearClipboard());
  };

  fitRotatedElementInContainer = (element, x, y, newRowHeight) => {
    if (typeof element === "string") {
      element = this.getElementById(element);
    }

    const row = this.getRowById(element.rowId);

    const newCoordinates = calcWrappingRotatedElementInContainer(
      element,
      { x, y },
      {
        x: row.x,
        y: row.y,
        width: row.width,
        height: newRowHeight || row.height,
      }
    );
    if (!newCoordinates) {
      element.updateElement({ x, y });
    } else {
      const updateParams = {
        x: newCoordinates.x,
        y: newCoordinates.y,
      };
      const isGroup = element.type === ELEMENT_TEMPLATE_TYPE.GROUP;
      const isText = element.type === ELEMENT_TEMPLATE_TYPE.TEXT;

      if (isText) {
        if (
          newCoordinates.scale !== 1 ||
          newCoordinates.scaleX !== 1 ||
          newCoordinates.scaleY !== 1
        ) {
          const updateTextParams = scaleTextElement(
            { ...element },
            newCoordinates.scale
          );
          Object.assign(updateParams, updateTextParams);
        }
      } else if (isGroup) {
        updateParams.scaleX = newCoordinates.scaleX;
        updateParams.scaleY = newCoordinates.scaleY;
      } else {
        updateParams.width = element.width * newCoordinates.scale;
        updateParams.height = element.height * newCoordinates.scale;
      }

      element.updateElement(updateParams);
    }
    return element;
  };

  updateLineElementPosition = (element, container, scale) => {
    const {
      x: containerX,
      y: containerY,
      width: containerWidth,
      height: containerHeight,
    } = container;

    let updateParams = {};

    if (scale && typeof scale === "number") {
      const scaleParams = scaleLineElement(element, scale);
      updateParams = { ...updateParams, ...scaleParams };
    }

    const lineContainer = calcWrappingLineElement(element);
    const lineLeft = lineContainer.x;
    const lineTop = lineContainer.y;
    const lineRight = lineContainer.x + lineContainer.width;
    const lineBottom = lineContainer.y + lineContainer.height;

    if (lineLeft < containerX) {
      updateParams.x = element.x + (containerX - lineLeft);
    } else if (lineRight > containerX + containerWidth) {
      updateParams.x = element.x + (containerX + containerWidth - lineRight);
    }

    if (lineTop < containerY) {
      updateParams.y = element.y + (containerY - lineTop);
    } else if (lineBottom > containerY + containerHeight) {
      updateParams.y = element.y + (containerY + containerHeight - lineBottom);
    }

    element.updateElement(updateParams);
    return element;
  };

  // From page.js
  updateDurationPage = async duration => {
    const durationFormat = Math.round(duration / 100) * 100;
    this.duration = durationFormat;
    const response = await updateAnimationPage({
      id: this.id,
      body: { duration: durationFormat },
    });
    if (response) return true;
    else return false;
  };

  calculateAnimationDurations = () => {
    const pageDuration = msToSecond(this.duration);
    const rootAnimations = this.availableChildren
      .filter(item => !item.groupId)
      .map(item => item?.elementAnimation);

    // Filter animation by animate type
    const enterElements = rootAnimations.filter(
      element =>
        ANIMATION_ANIMATE.ENTER_BOTH.includes(element?.animate) &&
        element.animationId !== ANIMATION_ID.NONE
    );
    const exitElements = rootAnimations.filter(
      element =>
        ANIMATION_ANIMATE.EXIT_BOTH.includes(element?.animate) &&
        element.animationId !== ANIMATION_ID.NONE
    );

    let pageEnterDuration = 0;
    let pageExitDuration = 0;
    let pageRemainingDuration = 0;

    // Calculate enter and exit duration
    enterElements.forEach((element, enterIdx) => {
      const enter = msToSecond(element.speed) || 0;

      if (enter > 0) {
        pageEnterDuration = +Math.max(
          pageEnterDuration,
          enter + enterIdx * DEFAULT_DELAY_ANIMATION
        ).toFixed(1);
      }
    });

    exitElements.forEach((element, exitIdx) => {
      const elementSpeed = msToSecond(element.speed) || 0;
      const exit = ANIMATIONS_COVER.includes(element.animationId)
        ? DEFAULT_COVER_DURATION
        : elementSpeed;

      if (exit > 0) {
        pageExitDuration = +Math.max(
          pageExitDuration,
          exit + exitIdx * DEFAULT_DELAY_ANIMATION
        ).toFixed(1);
      }
    });

    // Adjust duration stages follow rules
    if (pageEnterDuration > pageDuration) {
      pageEnterDuration = pageDuration;
      pageExitDuration = 0;
      pageRemainingDuration = 0;
    } else if (pageEnterDuration + pageExitDuration > pageDuration) {
      pageExitDuration = +(pageDuration - pageEnterDuration).toFixed(1);
      pageRemainingDuration = 0;
    } else {
      pageRemainingDuration = +(
        pageDuration -
        pageEnterDuration -
        pageExitDuration
      ).toFixed(1);
    }

    return {
      enterDuration: pageEnterDuration,
      remainingDuration: pageRemainingDuration,
      exitDuration: pageExitDuration,
    };
  };

  addVersionCode = () => {
    //current time + uuid
    const time = new Date().getTime();
    const uuid = uuidv4();
    this.versionCode = `${time}-${uuid}`;
  };

  addElements = elements => {
    const currentMaxIndex = this.children.length;
    const newElements = elements.map((element, index) => {
      const newIndex = index + currentMaxIndex + 1;
      if (element.type === ELEMENT_TEMPLATE_TYPE.GROUP) {
        return new GroupElementStore({
          ...element,
          templateId: this.templateId,
          sizeId: this.id,
          pageId: this.id,
          index: newIndex,
        });
      }
      return new Element({
        ...element,
        templateId: this.templateId,
        sizeId: this.id,
        index: newIndex,
        loaded: false,
        image: null,
      });
    });

    this.children = [...this.children, ...newElements];
    setTimeout(() => {
      this.setSelectedElements(newElements.filter(item => !item.groupId));
    }, 200);
  };

  setSelectedElements = elements => {
    const newSelectedElements = elements.map(item => ({
      id: item.id,
      type: item.type,
    }));
    const uniqueSelectedElements = uniqBy(newSelectedElements, "id");
    this.selectedElements = uniqueSelectedElements;
  };

  updateChildrenIndex = elements => {
    if (!elements || !elements.length) return;
    const children = [...this.children];
    let count = 0;
    elements
      .filter(item => !item.groupId)
      .forEach(ele => {
        const element = children.find(item => item.id === ele.id);
        if (element.type === ELEMENT_TEMPLATE_TYPE.GROUP) {
          element.updateElement({ index: count });
          count += element.elementIds.length + 1;
        } else {
          element.updateElement({ index: count });
          count += 1;
        }
      });
    this.children = children;
  };

  updatePage = updatedRequest => {
    Object.keys(updatedRequest).forEach(key => {
      if (key in this) {
        this[key] = updatedRequest[key];
      }
    });
  };

  toggleLockSelectedElements = (listening = true) => {
    const selectedElementIds = this.selectedElements.map(item => item.id);
    const elements = this.children.filter(element =>
      selectedElementIds.includes(element.id)
    );
    elements.forEach(element => {
      element.updateElement({ listening: listening });
    });
  };

  toggleVisibleSelectedElements = (visible = true) => {
    const selectedElementIds = this.selectedElements.map(item => item.id);
    const elements = this.children.filter(
      element => selectedElementIds.includes(element.id) && element.listening
    );
    elements.forEach(element => {
      element.updateElement({ visible: visible });
    });
    if (!visible) {
      this.setSelectedElements([]);
    }
  };

  sendForward = element => {
    const rootChildren = [...this.children.filter(item => !item.groupId)].sort(
      (a, b) => a.index - b.index
    );
    const currentIndex = rootChildren.findIndex(item => item.id === element.id);
    if (currentIndex === -1 || currentIndex === rootChildren.length - 1) return;

    const nextElement = rootChildren[currentIndex + 1];
    const indexMoveTo = nextElement.index;

    const focusElementIndex = rootChildren.findIndex(
      item => item.index === element.index
    );
    const swapElementIndex = rootChildren.findIndex(
      item => item.index === indexMoveTo
    );

    if (focusElementIndex === -1 || swapElementIndex === -1) return;

    const updatedList = update(rootChildren, {
      $splice: [
        [focusElementIndex, 1],
        [swapElementIndex, 0, rootChildren[focusElementIndex]],
      ],
    });
    return this.updateChildrenIndex(updatedList);
  };

  sendToFront = element => {
    const rootChildren = [...this.children.filter(item => !item.groupId)].sort(
      (a, b) => a.index - b.index
    );

    const maxIndex = Math.max(...rootChildren.map(item => item.index));

    if (maxIndex <= element.index) return;

    const focusElementIndex = rootChildren.findIndex(
      item => item.id === element.id
    );
    const maxIndexElementIndex = rootChildren.findIndex(
      item => item.index === maxIndex
    );
    if (focusElementIndex === -1 || maxIndexElementIndex === -1) return;

    const updatedList = update(rootChildren, {
      $splice: [
        [focusElementIndex, 1],
        [maxIndexElementIndex, 0, rootChildren[focusElementIndex]],
      ],
    });

    this.updateChildrenIndex(updatedList);
  };

  sendBackward = element => {
    const rootChildren = [...this.children.filter(item => !item.groupId)].sort(
      (a, b) => a.index - b.index
    );

    const currentIndex = rootChildren.findIndex(item => item.id === element.id);
    if (currentIndex === -1 || currentIndex === 0) return;

    const prevElement = rootChildren[currentIndex - 1];
    const indexMoveTo = prevElement.index;

    const focusElementIndex = rootChildren.findIndex(
      item => item.index === element.index
    );
    const swapElementIndex = rootChildren.findIndex(
      item => item.index === indexMoveTo
    );

    if (focusElementIndex === -1 || swapElementIndex === -1) return;

    const updatedList = update(rootChildren, {
      $splice: [
        [focusElementIndex, 1],
        [swapElementIndex, 0, rootChildren[focusElementIndex]],
      ],
    });
    return this.updateChildrenIndex(updatedList);
  };

  sendToBack = element => {
    const rootChildren = [...this.children.filter(item => !item.groupId)].sort(
      (a, b) => a.index - b.index
    );

    const minIndex = Math.min(...rootChildren.map(item => item.index));

    if (minIndex >= element.index) return;

    const focusElementIndex = rootChildren.findIndex(
      item => item.id === element.id
    );
    const minIndexElementIndex = rootChildren.findIndex(
      item => item.index === minIndex
    );

    if (focusElementIndex === -1 || minIndexElementIndex === -1) return;

    const updatedList = update(rootChildren, {
      $splice: [
        [focusElementIndex, 1],
        [minIndexElementIndex, 0, rootChildren[focusElementIndex]],
      ],
    });

    this.updateChildrenIndex(updatedList);
  };

  getRootChildren = () => {
    return this.children
      .filter(
        item =>
          (!item.groupId || item.type === ELEMENT_TEMPLATE_TYPE.GROUP) &&
          !item.id.includes("_clone")
      )
      .slice()
      .sort((a, b) => a.index - b.index);
  };

  setOrdinalNumber = ordinalNumber => {
    this.ordinalNumber = ordinalNumber;
  };

  setIsPublished = isPublished => {
    this.state = isPublished ? "Publish" : "Draft";
  };

  setIsClientCreator = isCreator => {
    this.clientCreator = isCreator;
  };

  countTotalGroups = data => {
    if (data && data.length > 0) {
      return data.filter(
        element => element.type === ELEMENT_TEMPLATE_TYPE.GROUP
      ).length;
    }
    return this.children.filter(
      element => element.type === ELEMENT_TEMPLATE_TYPE.GROUP
    ).length;
  };

  groupElements = () => {
    if (this.selectedElements.length < 2) return;
    const id = uuidv4();
    const selectedElements = this.children.filter(element =>
      this.selectedElements.some(item => item.id === element.id)
    );

    selectedElements.forEach(element => {
      if (element.type === ELEMENT_TEMPLATE_TYPE.GROUP) {
        selectedElements.push(...unGroupElementsAttrs(element));
      }
    });

    const selectedGroupIds = selectedElements
      .filter(element => element.type === ELEMENT_TEMPLATE_TYPE.GROUP)
      .map(element => element.id);

    const countGroup =
      this.countTotalGroups(this.children) -
      this.countTotalGroups(selectedElements);

    const elementsToGroup = selectedElements.filter(
      element => element.type !== ELEMENT_TEMPLATE_TYPE.GROUP
    );

    const elementsAttributes = elementsToGroup.map(element => {
      return {
        attrs: {
          ...(element.toJson ? element.toJson : element),
        },
      };
    });

    const rect = calcRectGroupElements(elementsAttributes);
    const newGroupIndex = this.children.length;
    const newGroupElement = new GroupElementStore({
      id,
      elementIds: elementsToGroup.map(element => element.id),
      templateSizeId: this.id,
      templateId: this.templateId,
      x: rect.startX,
      y: rect.startY,
      width: rect.endX - rect.startX,
      height: rect.endY - rect.startY,
      name: `Group ${countGroup + 1}`,
      index: newGroupIndex,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      pageId: this.id,
      visible: true,
      rowId: selectedElements[0].rowId,
      colId: selectedElements[0].colId,
    });

    elementsToGroup.forEach(element => {
      element.updateElement({
        loaded: true,
        groupId: newGroupElement.id,
        x: element.x - rect.startX,
        y: element.y - rect.startY,
        index: element.index,
      });
    });

    const newChildren = [...this.children, newGroupElement].filter(
      element => !selectedGroupIds.includes(element.id)
    );

    let countIndex = 0;

    newChildren
      .filter(child => !child.groupId)
      .sort((a, b) => a.index - b.index)
      .forEach(element => {
        element.updateElement({ countIndex });
        if (element.elementType === ELEMENT_TEMPLATE_TYPE.GROUP) {
          const groupChild = element.getElements();
          groupChild
            .sort((a, b) => a.index - b.index)
            .forEach((child, i) => {
              child.updateElement({ index: i + countIndex });
            });
          countIndex += groupChild.length;
        }
        countIndex += 1;
      });
    this.children = newChildren;
    setTimeout(() => {
      this.setSelected(newGroupElement.id, "selectedElementIds");
    }, 100);
  };

  ungroupedElements = () => {
    if (
      this.selectedElements.length !== 1 ||
      (this.selectedElements?.[0].type !== ELEMENT_TEMPLATE_TYPE.GROUP &&
        !this.selectedElements?.[0].groupId)
    )
      return;
    const groupId =
      this.selectedElements?.[0].type === ELEMENT_TEMPLATE_TYPE.GROUP
        ? this.selectedElements[0].id
        : this.selectedElements[0].groupId;
    const selectedGroup = this.children.find(element => element.id === groupId);

    if (!selectedGroup || !selectedGroup.ref) return;

    const unGroupElements = unGroupElementsAttrs(selectedGroup);
    const newChildren = [...this.children].filter(
      element =>
        element.id !== selectedGroup.id && element.groupId !== selectedGroup.id
    );

    let countIndex = 0;

    newChildren
      .filter(child => !child.groupId)
      .sort((a, b) => a.index - b.index)
      .forEach(element => {
        element.updateElement({ countIndex });
        if (element.elementType === ELEMENT_TEMPLATE_TYPE.GROUP) {
          const groupChild = element.getElements();
          groupChild
            .sort((a, b) => a.index - b.index)
            .forEach((child, i) => {
              child.updateElement({ index: i + countIndex });
            });
          countIndex += groupChild.length;
        }
        countIndex += 1;
      });
    this.children = newChildren;

    setTimeout(() => {
      this.setSelectedElements(
        unGroupElements.map(item => ({
          id: item.id,
          type: item.type,
        }))
      );
      this.assignIndexAnimations();
      // this.saveAnimationForEditor();
    }, 100);
  };

  saveComponent = (thumbnail, templateSizeId) => {
    if (this.selectedElements.length < 1) return;

    let finalSelectedElements = this.children.reduce((acc, element) => {
      // Check if the element is in the selectedElements
      if (this.selectedElements.some(item => item.id === element.id)) {
        if (element.type === ELEMENT_TEMPLATE_TYPE.GROUP) {
          // Spread the ungrouped children array into the accumulator
          const groupChildrenJson = element
            .getElements()
            ?.map(child => child.toJson);
          acc.push(...groupChildrenJson);
        }
        acc.push(element.toJson);
      }
      return acc;
    }, []);

    const rect = calcRectGroupElements(
      finalSelectedElements
        .filter(el => !el.groupId)
        .map(el => ({
          attrs: el,
        }))
    );

    finalSelectedElements = finalSelectedElements.map(el => ({
      ...el,
      loaded: false,
      image: null,
      ...(!el.groupId && {
        x: el.x - rect.startX,
        y: el.y - rect.startY,
      }),
    }));

    return savedComponentsStore.createSavedComponent({
      templateSizeId,
      files: thumbnail,
      children: finalSelectedElements,
    });
  };

  updateTemplateChildren = (child = {}) => {
    const page = this.storeValue;

    return handleUpdateTemplateSize({
      ...page,
      children: page?.children?.map(children =>
        children?.id !== child?.id
          ? children
          : {
            ...children,
            ...child,
          }
      ),
    });
  };

  selectAll = () => {
    if (
      this.selectedRowId ||
      this.selectedColId ||
      this.selectedSubRowId ||
      this.selectedElementIds.length > 0
    ) {
      let row;
      if (
        (!this.selectedRowId || !this.selectedSubRowId) &&
        this.selectedColId
      ) {
        // Recursively find the row from the column
        this.rows.forEach(_row => {
          _row.columns.forEach(col => {
            if (col.id === this.selectedColId) {
              row = _row;
              return;
            } else if (col.subRows) {
              col.subRows.forEach(subRow => {
                subRow.columns.forEach(subCol => {
                  if (subCol.id === this.selectedColId) {
                    row = subRow;
                    return;
                  }
                });
              });
            }
          });
        });
      } else if (this.selectedRowId || this.selectedSubRowId) {
        row = this.getRowById(this.selectedRowId || this.selectedSubRowId);
      } else if (this.selectedElementIds.length > 0) {
        const element = this.getElementById(this.selectedElementIds[0]);
        if (element) {
          row = this.getRowById(element.rowId);
        }
      }
      if (row) {
        if (row.rowId) {
          row = this.getRowById(row.rowId);
        }
        this.clearSelected();
        const _children = [];
        row.columns.forEach(col => {
          if (col.subRows) {
            col.subRows.forEach(subRow => {
              subRow.columns.forEach(subCol => {
                this.availableChildren.forEach(child => {
                  if (
                    !child.groupId &&
                    child.listening &&
                    child.rowId === subRow.id &&
                    child.colId === subCol.id
                  ) {
                    _children.push(child);
                  }
                });
              });
            });
          } else {
            this.availableChildren.forEach(child => {
              if (
                !child.groupId &&
                child.listening &&
                child.rowId === row.id &&
                child.colId === col.id
              ) {
                _children.push(child);
              }
            });
          }
        });
        if (_children.length === 1) {
          this.setSelected(_children[0].id, "selectedElementIds");
        } else {
          this.setSelected(
            _children.map(item => item.id),
            "selectedElementIds"
          );
        }
      }
    } else {
      this.setSelected(
        this.availableChildren
          .filter(item => !item.groupId && item.listening)
          .map(item => item.id),
        "selectedElementIds"
      );
    }
  };

  forceUpdateChildren = needUpdateChildren => {
    const children = [...this.children].map(element => {
      const updateElementAttributes = needUpdateChildren.find(
        item => item.id === element.id
      );
      if (!updateElementAttributes) return element;
      if (element.type === ELEMENT_TEMPLATE_TYPE.GROUP) {
        const group = new GroupElementStore({
          ...element.toJson,
          ...updateElementAttributes,
        });
        return group;
      } else {
        const cloneElement = new Element({
          ...element.toJson,
          ...updateElementAttributes,
          image: element.image,
        });
        return cloneElement;
      }
    });
    this.children = children;
  };

  shuffleColorParing = async data => {
    const { background, stroke, shadow, text, textBackground, elements } = data;

    const updateChildrenColors = children => {
      children.forEach((element, index) => {
        const color = elements[index % elements.length];
        const updateElementColors = {};

        switch (element.type) {
          case ELEMENT_TEMPLATE_TYPE.SVG:
            Object.assign(updateElementColors, {
              fill: color,
              svgColor: color,
            });
            break;
          case ELEMENT_TEMPLATE_TYPE.TEXT:
            Object.assign(updateElementColors, {
              textFill: color,
              shadowColor: shadow,
            });
            if (element.fill !== "transparent") {
              updateElementColors.fill = textBackground;
              updateElementColors.textFill = text;
            }

            const parser = new DOMParser();
            const textElement = parser.parseFromString(
              element.textHtml,
              "text/html"
            );
            const spanElements = textElement.querySelectorAll("span");
            if (spanElements) {
              spanElements.forEach(span => {
                span.style.color = color;
              });
              updateElementColors.textHtml = textElement.body.innerHTML;
            }

            updateElementColors.valueList = element.valueList.map(value => ({
              ...value,
              fill: color,
            }));

            break;
          case ELEMENT_TEMPLATE_TYPE.SHAPE:
          case ELEMENT_TEMPLATE_TYPE.GRAPHIC_SHAPE:
            Object.assign(updateElementColors, {
              fill: color,
              stroke: stroke,
              shadowColor: shadow,
            });
            break;
          default:
            Object.assign(updateElementColors, {
              stroke: stroke,
              shadowColor: shadow,
              svgColor: color,
            });
            break;
        }

        element.setElement(updateElementColors);
      });
    };

    this.background = background;
    this.onChangeRowColor(null, background);
    updateChildrenColors(this.children);

    const otherViewPage = emailStore.pages.find(
      page =>
        page.id !== this.id &&
        (page.parentId === this.parentId ||
          page.parentId === this.id ||
          this.parentId === page.id)
    );

    if (otherViewPage) {
      updateChildrenColors(otherViewPage.children);
    }
  };

  addDefaultLogo = () => {
    this.width = 600;
    this.height = 100;
    const defaultRows = [this.generateRow([100], this.width, this.height)];
    const initialChildren = EmailPage.getDefaultChildren(
      this.templateId,
      this.id,
      defaultRows[0],
      emailStore?.primaryLogo
    );
    this.rows = this.assignRows(defaultRows);
    this.children = this.assignChildren(initialChildren);

    setTimeout(() => {
      emailEditorHistory.updateState(this.storeValue);
      emailStore.syncResponsive(this.id, this.rows, "rows");
      emailStore.syncResponsive(this.id, this.childrenToJson, "children");
    }, 0);
  };

  // Animation
  setAnimationPage = ({ animations, config }) => {
    this.animations = animations || this.animations;
    this.animationConfig = config || this.animationConfig;
  };

  setEmitUpdateThumbnail = () => {
    const event = new CustomEvent("emitUpdateThumbnail");
    window.dispatchEvent(event);
  };

  assignIndexAnimations = () => {
    let enterCount = 0;
    let exitCount = 0;

    const rootElements = this.availableChildren.filter(item => !item.groupId);

    rootElements.forEach(element => {
      const elementAnimation = {
        ...AnimationSchema.elementConfig,
        ...(element?.elementAnimation || {}),
        id: element.id,
        elementType: element.elementType || element.type,
      };
      if (
        elementAnimation.animationId !== ANIMATION_ID.NONE &&
        elementAnimation.animationId !== ANIMATION_ID.KEYFRAME
      ) {
        if (elementAnimation.animate === ANIMATION_ANIMATE.ENTER) {
          elementAnimation.enterIndex = enterCount++;
        } else if (elementAnimation.animate === ANIMATION_ANIMATE.EXIT) {
          elementAnimation.exitIndex = exitCount++;
        } else if (elementAnimation.animate === ANIMATION_ANIMATE.BOTH) {
          elementAnimation.enterIndex = enterCount++;
          elementAnimation.exitIndex = exitCount++;
        }
      }
      element?.setAnimationElement?.(elementAnimation);
    });
  };

  clearElementAnimation = (elementId, updatedRequest) => {
    const selectedElement = this.getElementById(elementId);
    if (selectedElement) {
      selectedElement.setAnimationElement({
        ...AnimationSchema.elementConfig,
        ...updatedRequest,
      });
      this.assignIndexAnimations();
      // this.saveAnimationForEditor();
    }
  };

  updateElementAnimation = (updatedRequest, hardUpdate = false) => {
    const selectedElementId = this.selectedElements?.[0]?.id;
    const selectedElement = this.getElementById(selectedElementId);
    if (selectedElement) {
      if (hardUpdate) {
        selectedElement.setAnimationElement(updatedRequest);
      } else {
        selectedElement.setAnimationElement({
          ...selectedElement.elementAnimation,
          ...updatedRequest,
        });
      }
      this.assignIndexAnimations();
    }
  };

  updatePageAnimationConfig = config => {
    const newConfig = {
      ...this.animationConfig,
      ...config,
    };
    this.animationConfig = newConfig;
    this.children.forEach(item => {
      item.setAnimationElement(Object.assign(item.elementAnimation, newConfig));
    });
    this.assignIndexAnimations();
    // this.saveAnimationForEditor({ config: newConfig });
  };

  updatePageAnimationType = (animationId, options = {}) => {
    this.children.forEach(element => {
      const newAnimation = {
        ...element.elementAnimation,
        ...Object.fromEntries(Object.entries(options)),
        animationId: animationId,
        delay: null,
        keyframes: [],
      };
      element.setAnimationElement(newAnimation);
    });
    this.animationConfig = options;
    this.assignIndexAnimations();
  };

  switchElementAnimation = (elementId, updatedRequest) => {
    const selectedElement = this.getElementById(elementId);
    if (selectedElement) {
      const currentAnimation = selectedElement.elementAnimation;
      const elementType = updatedRequest?.elementType;
      const listAnimationTarget = ANIMATION_ELEMENT_LIST?.[elementType] || [];
      if (listAnimationTarget.includes(currentAnimation?.animationId)) {
        // keep current animation & expand with new request
        selectedElement.setAnimationElement({
          ...currentAnimation,
          ...updatedRequest,
        });
      } else {
        // reset animation "none"
        selectedElement.setAnimationElement({
          ...AnimationSchema.elementConfig,
          ...updatedRequest,
        });
      }
    }
  };

  saveAnimationForEditor = (props = {}) => {
    const animations = [];
    this.children.forEach(element => {
      if (element?.elementAnimation?.id) {
        const copyAnimation = element?.elementAnimation || {};
        if ("enterIndex" in copyAnimation) {
          delete copyAnimation.enterIndex;
        }
        if ("exitIndex" in copyAnimation) {
          delete copyAnimation.exitIndex;
        }
        animations.push(copyAnimation);
      }
    });
    this.setAnimationPage({
      ...(props || {}),
      animations: animations,
    });
  };

  syncKeyframeElements = (newPageTimeline, oldPageTimeline) => {
    const durationRatio = newPageTimeline.duration / oldPageTimeline.duration;
    let widthRatio = newPageTimeline.width / oldPageTimeline.width;
    if (
      Number.isNaN(durationRatio) ||
      Number.isNaN(widthRatio) ||
      (durationRatio === 1 && widthRatio === 1)
    )
      return;

    if (durationRatio !== 1) {
      widthRatio = 1;
    }

    const calculateDurationPoint = xPoint =>
      (xPoint / newPageTimeline.width) * newPageTimeline.duration || 0;

    this.children.forEach(element => {
      if (element?.elementAnimation?.animationId === ANIMATION_ID.KEYFRAME) {
        const keyframes = element.elementAnimation.keyframes || [];
        // console.log("keyframes before:", toJS(keyframes));
        const updatedKeyframes = keyframes.map(point => {
          const newXPoint = Math.round(
            point.xPoint * durationRatio * widthRatio
          );
          const newDuration = calculateDurationPoint(newXPoint);
          return {
            ...point,
            xPoint: newXPoint,
            duration: msToSecond(newDuration),
            xMin: Math.round(point.xMin * durationRatio * widthRatio),
            xMax: Math.round(point.xMax * durationRatio * widthRatio),
          };
        });
        // console.log("points after:", toJS(updatedPoints));
        element.setAnimationElement({
          ...element.elementAnimation,
          keyframes: updatedKeyframes,
        });
      }
    });
  };

  getRowBySubRowId(subRowId) {
    if (!subRowId) return null;
    const sr = this.getRowById(subRowId);
    if (!sr) return null;
    return this.getRowById(sr.rowId);
  }

  // getter computed
  get availableUndo() {
    return emailEditorHistory.availableUndo(this.id);
  }

  get availableRedo() {
    return emailEditorHistory.availableRedo(this.id);
  }

  get isMobileView() {
    return this.viewMode === EMAIL_VIEW_MODE.MOBILE;
  }

  get isColorPairingReady() {
    return this.children.some(child => {
      if (child.type === ELEMENT_TEMPLATE_TYPE.IMAGE) return true;
      if (child.type === ELEMENT_TEMPLATE_TYPE.SHAPE && child.src !== "")
        return true;
    });
  }

  get animationPageId() {
    const comparedId = this.children[0]?.elementAnimation?.animationId;
    if (
      this.children.every(
        element => element?.elementAnimation?.animationId === comparedId
      )
    ) {
      return comparedId;
    }
    return null;
  }

  get pageRows() {
    // Use cached version if rows haven't changed
    if (this._cachedPageRows && this._rowsVersion === this.rows.length) {
      // Quick check: if rows array reference changed, invalidate cache
      const currentRowsHash = this.rows.map(r => r.id).join(",");
      if (this._rowsHash === currentRowsHash) {
        return this._cachedPageRows;
      }
    }
    // Invalidate cache and recalculate
    this._cachedPageRows = JSON.parse(JSON.stringify(this.rows));
    this._rowsVersion = this.rows.length;
    this._rowsHash = this.rows.map(r => r.id).join(",");
    return this._cachedPageRows;
  }

  get childrenToJson() {
    // Use cached version if children haven't changed
    if (
      this._cachedChildrenToJson &&
      this._childrenVersion === this.children.length
    ) {
      // Quick check: if children array reference changed, invalidate cache
      const currentChildrenHash = this.children.map(c => c.id).join(",");
      if (this._childrenHash === currentChildrenHash) {
        return this._cachedChildrenToJson;
      }
    }
    // Invalidate cache and recalculate
    const elements = this.children;
    this._cachedChildrenToJson = elements.map(element => element.toJson);
    this._childrenVersion = this.children.length;
    this._childrenHash = this.children.map(c => c.id).join(",");
    return this._cachedChildrenToJson;
  }

  get richTexts() {
    return this.childrenToJson.filter(
      element => element.type === ELEMENT_TEMPLATE_TYPE.TEXT
    );
  }

  get availableChildren() {
    return this.children.filter(element => {
      if (!Object.values(ELEMENT_TEMPLATE_TYPE).includes(element.elementType)) {
        return false;
      }
      return element.visible;
    });
  }

  get isLoadedPage() {
    if (!this.id) return false;
    if (this.availableChildren.length === 0) return true;
    return this.availableChildren.every(element => {
      if (element.type === ELEMENT_TEMPLATE_TYPE.GROUP) {
        const groupChildren = this.children.filter(
          item => item.groupId === element.id
        );
        return groupChildren.every(item => item.loaded);
      }
      return element.loaded;
    });
  }

  get haveEditingElement() {
    return !!this.children.find(element => element?.editing);
  }

  get selectedElementsAttributes() {
    return this.children.filter(element =>
      this.selectedElements.some(item => item.id === element.id)
    );
  }

  get durationStages() {
    return {
      ...(this.calculateAnimationDurations() || {}),
      startTimePage: 0,
      endTimePage: msToSecond(this.duration),
      pageDuration: msToSecond(this.duration),
      // startTimePage: msToSecond(emailStore.calculateStartTimePage(this.id)),
      // endTimePage: msToSecond(emailStore.calculateEndTimePage(this.id)),
    };
  }

  get editorTimeLineNode() {
    let x = 0;
    const { DEFAULT_EMAIL_PIXEL_PER_SECOND, MINIMUM_WIDTH } =
      TIMELINE_INTERFACE;

    const isShortDuration = this.duration < 1000; // ms
    let scaleWidthRatio =
      (isShortDuration ? 1000 / this.duration : 1) *
      emailStore.zoomTimelineRatio;
    let pixelPerSecond = scaleWidthRatio * DEFAULT_EMAIL_PIXEL_PER_SECOND;
    let pageWidth = msToSecond(this.duration) * pixelPerSecond;
    if (pageWidth < MINIMUM_WIDTH) {
      const ratioChange = pageWidth / MINIMUM_WIDTH;
      pixelPerSecond = MINIMUM_WIDTH / msToSecond(this.duration);
      scaleWidthRatio = scaleWidthRatio * ratioChange;
      pageWidth = MINIMUM_WIDTH;
    }

    const pageTimelineNode = {
      type: "page",
      duration: this.duration,
      id: this.id,
      isHide: this.hidePage,
      scaleWidthRatio: scaleWidthRatio,
      pixelPerSecond: pixelPerSecond,
      width: pageWidth,
      xStart: x,
      xEnd: x + pageWidth,
    };
    this.pageTimelineNode = pageTimelineNode;
    return pageTimelineNode;
  }

  get propsForThumbnail() {
    return {
      background: this.background,
      backgroundGradient: this.backgroundGradient,
      children: this.children,
      selectedElements: this.selectedElements,
      childrenLength: this.children.length,
      isLoadedPage: this.isLoadedPage,
    };
  }

  get toJson() {
    return JSON.parse(
      JSON.stringify({
        id: this.id,
        name: this.name,
        channel: this.channel,
        channelGroup: this.channelGroup,
        sizeTemplate: this.sizeTemplate,
        templateId: this.templateId,
        templateType: this.templateType,
        parentId: this.parentId,
        approvalStatus: this.approvalStatus,
        approvalBy: this.approvalBy,
        approvalUserIds: this.approvalUserIds,
        children: this.childrenToJson,
        fonts: this.fonts,
        background: this.background,
        outerBackground: this.outerBackground,
        backgroundGradient: this.backgroundGradient,
        bleed: this.bleed,
        animations: [],
        animationConfig: this.animationConfig,
        duration: this.duration,
        hidePage: this.hidePage,
        zoomTimeline: this.zoomTimeline,
        ordinalNumber: this.ordinalNumber,
        thumbnail: this.thumbnail,
        guideConfig: this.guideConfig,
        marginConfig: this.marginConfig,
        displayGuideAndMargin: this.displayGuideAndMargin,
        custom: this.custom,
        rows: this.rows,
        height: this.height,
        width: this.width,
        viewMode: this.viewMode,
      })
    );
  }

  get storeValue() {
    return JSON.parse(
      JSON.stringify({
        id: this.id,
        name: this.name,
        channel: this.channel,
        channelGroup: this.channelGroup,
        sizeTemplate: this.sizeTemplate,
        templateId: this.templateId,
        templateType: this.templateType,
        parentId: this.parentId,
        children: this.childrenToJson,
        fonts: this.fonts,
        background: this.background,
        outerBackground: this.outerBackground,
        backgroundGradient: this.backgroundGradient,
        bleed: this.bleed,
        animations: [],
        animationConfig: this.animationConfig,
        duration: this.duration,
        hidePage: this.hidePage,
        zoomTimeline: this.zoomTimeline,
        ordinalNumber: this.ordinalNumber,
        pageId: this.pageId,
        custom: this.custom,
        guideConfig: this.guideConfig,
        marginConfig: this.marginConfig,
        displayGuideAndMargin: this.displayGuideAndMargin,
        rows: this.rows,
        height: this.height,
        width: this.width,
        viewMode: this.viewMode,
      })
    );
  }
}
