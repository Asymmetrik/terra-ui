import arrayMove from 'array-move'
import _ from 'lodash/fp'
import PropTypes from 'prop-types'
import { Fragment, useImperativeHandle, useRef, useState } from 'react'
import Draggable from 'react-draggable'
import { button, div, h, label, option, select } from 'react-hyperscript-helpers'
import Pagination from 'react-paginating'
import { SortableContainer, SortableElement, SortableHandle } from 'react-sortable-hoc'
import { AutoSizer, Grid as RVGrid, List, ScrollSync as RVScrollSync } from 'react-virtualized'
import { ButtonPrimary, Clickable, IdContainer, LabeledCheckbox, Link } from 'src/components/common'
import { icon } from 'src/components/icons'
import Interactive from 'src/components/Interactive'
import Modal from 'src/components/Modal'
import TooltipTrigger from 'src/components/TooltipTrigger'
import colors from 'src/libs/colors'
import * as Style from 'src/libs/style'
import * as Utils from 'src/libs/utils'


const paginatorButton = (props, label) => button(_.merge({
  style: {
    margin: '0 2px', padding: '0.25rem 0.5rem',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    border: '1px solid #ccc', borderRadius: 3,
    color: props.disabled ? colors.dark(0.7) : colors.accent(), backgroundColor: 'white',
    cursor: props.disabled ? 'not-allowed' : 'pointer'
  }
}, props), label)

/**
 * @param {number} props.filteredDataLength
 * @param {number} props.pageNumber
 * @param {function(number)} props.setPageNumber
 * @param {function(number)} [props.setItemsPerPage]
 * @param {number} props.itemsPerPage
 * @param {number[]} [props.itemsPerPageOptions=[10,25,50,100]]
 */
export const paginator = ({
  filteredDataLength, unfilteredDataLength, pageNumber, setPageNumber, setItemsPerPage,
  itemsPerPage, itemsPerPageOptions = [10, 25, 50, 100]
}) => {
  return h(Pagination, {
    total: filteredDataLength,
    limit: itemsPerPage,
    pageCount: 5,
    currentPage: pageNumber
  }, [
    ({ pages, currentPage, hasNextPage, hasPreviousPage, previousPage, nextPage, totalPages, getPageItemProps }) => h(Fragment,
      [
        div({ style: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginRight: '1rem' } }, [
          `${(pageNumber - 1) * itemsPerPage + 1} - ${_.min([filteredDataLength, pageNumber * itemsPerPage])} of ${filteredDataLength}`,
          unfilteredDataLength && filteredDataLength !== unfilteredDataLength && ` (filtered from ${unfilteredDataLength} total)`,
          div({ style: { display: 'inline-flex', padding: '0 1rem' } }, [

            paginatorButton(
              _.merge({ 'aria-label': 'First page', disabled: currentPage === 1, style: { marginRight: '0.5rem' } },
                getPageItemProps({ pageValue: 1, onPageChange: setPageNumber })),
              [icon('angle-double-left', { size: 12 })]
            ),

            paginatorButton(
              _.merge({ 'aria-label': 'Previous page', disabled: !hasPreviousPage, style: { marginRight: '1rem' } },
                getPageItemProps({ pageValue: previousPage, onPageChange: setPageNumber })),
              [icon('angle-left', { size: 12 })]
            ),

            _.map(num => paginatorButton(
              _.merge({
                key: num,
                style: {
                  minWidth: '2rem',
                  backgroundColor: currentPage === num ? colors.accent() : undefined,
                  color: currentPage === num ? 'white' : colors.accent(),
                  border: currentPage === num ? colors.accent() : undefined
                }
              },
              getPageItemProps({ pageValue: num, onPageChange: setPageNumber })),
              num), pages
            ),

            paginatorButton(
              _.merge({ 'aria-label': 'Next page', disabled: !hasNextPage, style: { marginLeft: '1rem' } },
                getPageItemProps({ pageValue: nextPage, onPageChange: setPageNumber })),
              [icon('angle-right', { size: 12 })]
            ),

            paginatorButton(
              _.merge({ 'aria-label': 'Last page', disabled: currentPage === totalPages, style: { marginLeft: '0.5rem' } },
                getPageItemProps({ pageValue: totalPages, onPageChange: setPageNumber })),
              [icon('angle-double-right', { size: 12 })]
            )
          ]),

          setItemsPerPage && h(IdContainer, [id => h(Fragment, [
            label({ htmlFor: id }, ['Items per page:']),
            select({
              id,
              style: { marginLeft: '0.5rem' },
              onChange: e => setItemsPerPage(parseInt(e.target.value, 10)),
              value: itemsPerPage
            },
            _.map(i => option({ value: i }, i),
              itemsPerPageOptions))
          ])])
        ])
      ]
    )
  ])
}

const cellStyles = {
  display: 'flex',
  alignItems: 'center',
  paddingLeft: '1rem',
  paddingRight: '1rem'
}

const styles = {
  cell: (col, total) => ({
    ...cellStyles,
    borderBottom: `1px solid ${colors.dark(0.2)}`,
    borderLeft: `1px solid ${colors.dark(0.2)}`,
    borderRight: col === total - 1 ? `1px solid ${colors.dark(0.2)}` : undefined
  }),
  header: (col, total) => ({
    ...cellStyles,
    backgroundColor: colors.light(0.5),
    borderTop: `1px solid ${colors.dark(0.2)}`,
    borderBottom: `1px solid ${colors.dark(0.2)}`,
    borderLeft: `1px solid ${colors.dark(0.2)}`,
    borderRight: col === total - 1 ? `1px solid ${colors.dark(0.2)}` : undefined,
    borderTopLeftRadius: col === 0 ? '5px' : undefined,
    borderTopRightRadius: col === total - 1 ? '5px' : undefined
  }),
  flexCell: ({ basis = 0, grow = 1, shrink = 1, min = 0, max } = {}) => ({
    flexGrow: grow,
    flexShrink: shrink,
    flexBasis: basis,
    minWidth: min,
    maxWidth: max
  }),
  columnSelector: {
    position: 'absolute', top: 0, right: 0, width: 48, height: 48,
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    color: colors.accent(), backgroundColor: colors.light(0.4),
    border: `1px solid ${colors.dark(0.2)}`,
    borderRadius: 5
  },
  columnName: {
    paddingLeft: '0.25rem',
    flex: 1, display: 'flex', alignItems: 'center',
    ...Style.noWrapEllipsis
  },
  columnHandle: {
    paddingRight: '0.25rem', cursor: 'move',
    display: 'flex', alignItems: 'center'
  }
}

// Calculate a suitable pixel height for a table, capped at a certain number of rows.
// Note: We always need 1 extra row's worth of height for the table header row:
export const tableHeight = ({ actualRows, maxRows, heightPerRow = 48 }) => (_.min([actualRows, maxRows]) + 1) * heightPerRow

/**
 * A virtual table with a fixed header and flexible column widths. Intended to take up the full
 * available container width, without horizontal scrolling.
 */
export const FlexTable = ({
  initialY = 0, width, height, rowCount, variant, columns = [], hoverHighlight = false,
  onScroll = _.noop, noContentMessage = null, ...props
}) => {
  const [scrollbarSize, setScrollbarSize] = useState(0)
  const body = useRef()

  Utils.useOnMount(() => {
    body.current.scrollToPosition({ scrollTop: initialY })
  })

  return div([
    div({
      style: {
        width: width - scrollbarSize,
        height: 48,
        display: 'flex'
      }
    }, [
      ..._.map(([i, { size, headerRenderer }]) => {
        return div({
          key: i,
          style: { ...styles.flexCell(size), ...(variant === 'light' ? {} : styles.header(i * 1, columns.length)) }
        }, [headerRenderer()])
      }, _.toPairs(columns))
    ]),
    h(RVGrid, {
      ref: body,
      width,
      height: height - 48,
      columnWidth: width - scrollbarSize,
      rowHeight: 48,
      rowCount,
      columnCount: 1,
      onScrollbarPresenceChange: ({ vertical, size }) => {
        setScrollbarSize(vertical ? size : 0)
      },
      cellRenderer: data => {
        return h(Interactive, {
          key: data.key,
          as: 'div',
          className: 'table-row',
          style: { ...data.style, backgroundColor: 'white', display: 'flex' },
          hover: hoverHighlight ? { backgroundColor: colors.light(0.4) } : undefined
        }, [
          _.map(([i, { size, cellRenderer }]) => {
            return div({
              key: i,
              className: 'table-cell',
              style: { ...styles.flexCell(size), ...(variant === 'light' ? {} : styles.cell(i * 1, columns.length)) }
            }, [cellRenderer(data)])
          }, _.toPairs(columns))
        ])
      },
      style: { outline: 'none' },
      onScroll: ({ scrollTop }) => onScroll(scrollTop),
      noContentRenderer: () => div({ style: { marginTop: '1rem', textAlign: 'center', fontStyle: 'italic' } }, [noContentMessage]),
      ...props
    })
  ])
}

FlexTable.propTypes = {
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  initialY: PropTypes.number,
  rowCount: PropTypes.number.isRequired,
  variant: PropTypes.oneOf(['light']),
  noContentMessage: PropTypes.node,
  columns: PropTypes.arrayOf(PropTypes.shape({
    headerRenderer: PropTypes.func.isRequired,
    cellRenderer: PropTypes.func.isRequired,
    size: PropTypes.shape({
      basis: PropTypes.number, // flex-basis in px, default 0
      grow: PropTypes.number, // flex-grow, default 1
      max: PropTypes.number, // max-width in px
      min: PropTypes.number, // min-width in px, default 0
      shrink: PropTypes.number // flex-shrink, default 1
    })
  })),
  hoverHighlight: PropTypes.bool,
  onScroll: PropTypes.func
}

/**
 * A basic table with a header and flexible column widths. Intended for small amounts of data,
 * since it does not provide scrolling. See FlexTable for prop types.
 */
export const SimpleFlexTable = ({ columns, rowCount, noContentMessage, hoverHighlight }) => {
  return h(Fragment, [
    div({ style: { height: 48, display: 'flex' } }, [
      _.map(([i, { size, headerRenderer }]) => {
        return div({
          key: i,
          style: { ...styles.flexCell(size), ...styles.header(i * 1, columns.length) }
        }, [headerRenderer()])
      }, Utils.toIndexPairs(columns))
    ]),
    _.map(rowIndex => {
      return h(Interactive, {
        key: rowIndex,
        as: 'div',
        className: 'table-row',
        style: { backgroundColor: 'white', display: 'flex', minHeight: 48 },
        hover: hoverHighlight ? { backgroundColor: colors.light(0.4) } : undefined
      }, [
        _.map(([i, { size, cellRenderer }]) => {
          return div({
            key: i,
            className: 'table-cell',
            style: { ...styles.flexCell(size), ...styles.cell(i * 1, columns.length) }
          }, [cellRenderer({ rowIndex })])
        }, Utils.toIndexPairs(columns))
      ])
    }, _.range(0, rowCount)),
    !rowCount && div({ style: { marginTop: '1rem', textAlign: 'center', fontStyle: 'italic' } }, [noContentMessage])
  ])
}

/**
 * A virtual table with a fixed header and explicit column widths. Intended for displaying large
 * datasets which may require horizontal scrolling.
 */
export const GridTable = Utils.forwardRefWithName('GridTable', ({
  width, height, initialX = 0, initialY = 0,
  rowCount, columns, styleCell = () => ({}), onScroll: customOnScroll = _.noop, noContentMessage
}, ref) => {
  const [scrollbarSize, setScrollbarSize] = useState(0)
  const header = useRef()
  const body = useRef()
  const scrollSync = useRef()

  Utils.useOnMount(() => {
    if (rowCount > 0) {
      body.current.measureAllCells()

      scrollSync.current._onScroll({ scrollLeft: initialX }) //BEWARE: utilizing private method from scrollSync that is not intended to be used

      body.current.scrollToPosition({ scrollLeft: initialX, scrollTop: initialY }) // waiting to let ScrollSync initialize
    }
  })

  useImperativeHandle(ref, () => ({
    recomputeColumnSizes: () => {
      header.current.recomputeGridSize()
      body.current.recomputeGridSize()
      body.current.measureAllCells()
    },
    scrollToTop: () => {
      body.current.scrollToPosition({ scrollTop: 0, scrollLeft: 0 })
    }
  }))

  return h(RVScrollSync, {
    ref: scrollSync
  }, [
    ({ onScroll, scrollLeft }) => {
      return div([
        h(RVGrid, {
          ref: header,
          width: width - scrollbarSize,
          height: 48,
          columnWidth: ({ index }) => columns[index].width,
          rowHeight: 48,
          rowCount: 1,
          columnCount: columns.length,
          cellRenderer: data => {
            return div({
              key: data.key,
              className: 'table-cell',
              style: { ...data.style, ...styles.header(data.columnIndex, columns.length) }
            }, [
              columns[data.columnIndex].headerRenderer(data)
            ])
          },
          style: { outline: 'none', overflowX: 'hidden', overflowY: 'hidden' },
          scrollLeft,
          onScroll
        }),
        h(RVGrid, {
          ref: body,
          width,
          height: height - 48,
          columnWidth: ({ index }) => columns[index].width,
          rowHeight: 48,
          rowCount,
          columnCount: columns.length,
          noContentRenderer: () => div({ style: { marginTop: '1rem', textAlign: 'center', fontStyle: 'italic' } }, [noContentMessage]),
          onScrollbarPresenceChange: ({ vertical, size }) => {
            setScrollbarSize(vertical ? size : 0)
          },
          cellRenderer: data => {
            return div({
              key: data.key,
              className: 'table-cell',
              style: {
                ...data.style,
                ...styles.cell(data.columnIndex, columns.length),
                backgroundColor: 'white',
                ...styleCell(data)
              }
            }, [
              columns[data.columnIndex].cellRenderer(data)
            ])
          },
          style: { outline: 'none' },
          scrollLeft,
          onScroll: details => {
            onScroll(details)
            const { scrollLeft, scrollTop } = details
            customOnScroll(scrollLeft, scrollTop)
          }
        })
      ])
    }
  ])
})

GridTable.propTypes = {
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  initialX: PropTypes.number,
  initialY: PropTypes.number,
  rowCount: PropTypes.number.isRequired,
  styleCell: PropTypes.func,
  columns: PropTypes.arrayOf(PropTypes.shape({ width: PropTypes.number.isRequired })),
  onScroll: PropTypes.func
}

export const SimpleTable = ({ columns, rows }) => {
  const cellStyles = { paddingTop: '0.25rem', paddingBottom: '0.25rem' }
  return h(Fragment, [
    div({ style: { display: 'flex' } }, [
      _.map(({ key, header, size }) => {
        return div({ key, style: { ...cellStyles, ...styles.flexCell(size) } }, [header])
      }, columns)
    ]),
    _.map(([i, row]) => {
      return h(Interactive, {
        key: i,
        as: 'div',
        style: { display: 'flex' }, className: 'table-row',
        hover: { backgroundColor: colors.light(0.4) }
      }, [
        _.map(({ key, size }) => {
          return div({
            key,
            className: 'table-cell',
            style: {
              ...cellStyles, ...styles.flexCell(size),
              borderTop: `1px solid ${colors.dark(0.2)}`
            }
          }, [row[key]])
        }, columns)
      ])
    }, _.toPairs(rows))
  ])
}

export const TextCell = ({ children, ...props }) => {
  return div(_.merge({ style: Style.noWrapEllipsis }, props), [children])
}

export const TooltipCell = ({ children, tooltip, ...props }) => h(TooltipTrigger, {
  content: tooltip || children
}, [h(TextCell, props, [children])])

export const HeaderCell = props => {
  return h(TextCell, _.merge({ style: { fontWeight: 500 } }, props))
}

export const Sortable = ({ sort, field, onSort, children }) => {
  return div({
    style: { flex: 1, display: 'flex', alignItems: 'center', cursor: 'pointer', width: '100%' },
    onClick: () => onSort(Utils.nextSort(sort, field))
  }, [
    children,
    sort.field === field && div({
      style: { color: colors.accent(), marginLeft: 'auto' }
    }, [
      icon(sort.direction === 'asc' ? 'long-arrow-alt-down' : 'long-arrow-alt-up')
    ])
  ])
}

export const MiniSortable = ({ sort, field, onSort, children }) => {
  return div({
    style: { display: 'flex', alignItems: 'center', cursor: 'pointer', height: '100%' },
    onClick: () => onSort(Utils.nextSort(sort, field))
  }, [
    children,
    sort.field === field && div({
      style: { color: colors.accent(), marginLeft: '1rem' }
    }, [
      icon(sort.direction === 'asc' ? 'long-arrow-alt-down' : 'long-arrow-alt-up')
    ])
  ])
}

export const Resizable = ({ onWidthChange, width, minWidth = 100, children }) => {
  const [dragAmount, setDragAmount] = useState(undefined)
  const [lastX, setLastX] = useState(undefined)

  return div({
    style: { flex: 1, display: 'flex', alignItems: 'center', position: 'relative', width: '100%' }
  }, [
    children,
    h(Draggable, {
      axis: 'x',
      onStart: e => {
        setLastX(e.clientX)
        setDragAmount(0)
      },
      onDrag: e => {
        const deltaX = e.clientX - lastX
        if (deltaX !== 0 && width + dragAmount + deltaX > minWidth) {
          setDragAmount(dragAmount + deltaX)
          setLastX(e.clientX)
        }
      },
      onStop: () => {
        setDragAmount(undefined)
        onWidthChange(dragAmount)
      },
      position: { x: 0, y: 0 }
    }, [
      icon('columnGrabber', {
        size: 24,
        style: { position: 'absolute', right: -20, cursor: 'ew-resize' }
      })
    ]),
    !!dragAmount && icon('columnGrabber', {
      size: 24,
      style: { position: 'absolute', right: -20 - dragAmount, zIndex: 1, opacity: '0.5', cursor: 'ew-resize' }
    })
  ])
}

const SortableDiv = SortableElement(props => div(props))
const SortableList = SortableContainer(props => h(List, props))
const SortableHandleDiv = SortableHandle(props => div(props))

/**
 * @param {Object[]} columnSettings - current column list, in order
 * @param {string} columnSettings[].name
 * @param {bool} columnSettings[].visible
 * @param {function(Object[])} onSave - called with modified settings when user saves
 */
export const ColumnSelector = ({ onSave, columnSettings }) => {
  const [open, setOpen] = useState(false)
  const [modifiedColumnSettings, setModifiedColumnSettings] = useState(undefined)

  const toggleVisibility = index => {
    setModifiedColumnSettings(_.update([index, 'visible'], b => !b))
  }

  const setAll = value => {
    setModifiedColumnSettings(_.map(_.set('visible', value)))
  }

  const sort = () => {
    setModifiedColumnSettings(_.sortBy('name'))
  }

  const reorder = ({ oldIndex, newIndex }) => {
    setModifiedColumnSettings(arrayMove(modifiedColumnSettings, oldIndex, newIndex))
  }

  return h(Fragment, [
    h(Clickable, {
      'aria-label': 'Select columns',
      style: styles.columnSelector,
      tooltip: 'Select columns',
      onClick: () => {
        setOpen(true)
        setModifiedColumnSettings(columnSettings)
      }
    }, [icon('cog', { size: 20 })]),
    open && h(Modal, {
      title: 'Select columns',
      onDismiss: () => setOpen(false),
      okButton: h(ButtonPrimary, {
        onClick: () => {
          onSave(modifiedColumnSettings)
          setOpen(false)
        }
      }, ['Done'])
    }, [
      div({ style: { marginBottom: '1rem', display: 'flex' } }, [
        div({ style: { fontWeight: 500 } }, ['Show:']),
        h(Link, { style: { padding: '0 0.5rem' }, onClick: () => setAll(true) }, ['all']),
        '|',
        h(Link, { style: { padding: '0 0.5rem' }, onClick: () => setAll(false) }, ['none']),
        div({ style: { marginLeft: 'auto', fontWeight: 500 } }, ['Sort:']),
        h(Link, { style: { padding: '0 0.5rem' }, onClick: () => sort() }, ['alphabetical'])
      ]),
      h(AutoSizer, { disableHeight: true }, [
        ({ width }) => {
          return h(SortableList, {
            style: { outline: 'none' },
            lockAxis: 'y',
            useDragHandle: true,
            width, height: 400,
            rowCount: modifiedColumnSettings.length,
            rowHeight: 30,
            rowRenderer: ({ index, style, key }) => {
              const { name, visible } = modifiedColumnSettings[index]
              return h(SortableDiv, { key, index, style: { ...style, display: 'flex' } }, [
                h(SortableHandleDiv, { style: styles.columnHandle }, [
                  icon('columnGrabber', { style: { transform: 'rotate(90deg)' } })
                ]),
                div({ style: { display: 'flex', alignItems: 'center' } }, [
                  h(LabeledCheckbox, {
                    checked: visible,
                    onChange: () => toggleVisibility(index)
                  }, [
                    h(Clickable, {
                      style: styles.columnName
                    }, [name])
                  ])
                ])
              ])
            },
            onSortEnd: v => reorder(v)
          })
        }
      ])
    ])
  ])
}
