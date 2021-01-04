import _ from 'lodash/fp'
import { div, h } from 'react-hyperscript-helpers'
import { AutoSizer } from 'react-virtualized'
import { FlexTable, Sortable, TooltipCell } from 'src/components/table'
import colors from 'src/libs/colors'
import FailuresViewer from 'src/pages/workspaces/workspace/jobHistory/FailuresViewer'
import { Fragment, useState } from 'react'
import { Link } from 'src/components/common'
import * as Nav from 'src/libs/nav'
import { icon } from 'src/components/icons'
import {
  collapseCromwellExecutionStatus,
  cromwellExecutionStatusIcon,
  makeCromwellStatusLine,
  makeStatusLine
} from 'src/components/job-common'
import CallCacheWizard from 'src/pages/workspaces/workspace/jobHistory/CallCacheWizard'

const CallTable = ({ namespace, name, submissionId, workflowId, callName, callObjects }) => {

  const [wizardVisible, setWizardVisible] = useState()

  return div([
    h(FlexTable, {
      height: _.min([callObjects.length * 100, 600]),
      width: _.max([window.screen.width - 200, 0]),
      rowCount: callObjects.length,
      noContentMessage: 'No matching workflows',
      columns: [
        {
          size: { basis: 200, grow: 0 },
          headerRenderer: () => 'Status',
          cellRenderer: ({ rowIndex }) => {
            const { executionStatus } = callObjects[rowIndex]
            return h(TooltipCell, [makeCromwellStatusLine(executionStatus)])
          }
        }, {
          size: { basis: 100, grow: 0 },
          headerRenderer: () => 'Index',
          cellRenderer: ({ rowIndex }) => {
            const { shardIndex } = callObjects[rowIndex]
            return h(TooltipCell, [shardIndex >= 0 ? shardIndex : 'N/A'])
          }
        }, {
          size: { basis: 100, grow: 0 },
          headerRenderer: () => 'Attempt',
          cellRenderer: ({ rowIndex }) => {
            const { attempt } = callObjects[rowIndex]
            return h(TooltipCell, [attempt])
          }
        },
        {
          size: { basis: 200, grow: 1 },
          headerRenderer: () => 'Call Caching Result',
          cellRenderer: ({ rowIndex }) => {
            const { callCaching: { result } = {} } = callObjects[rowIndex]
            if (result) {
              return h(TooltipCell, [
                result,
                result === 'Cache Miss' && h(Link, {
                  onClick: () => setWizardVisible(true)
                }, ['LINK'])
              ])
            } else {
              return div({ style: { color: colors.dark(0.7) } }, ['No Information'])
            }
          }
        },
        {
          size: { basis: 100, grow: 1 },
          headerRenderer: () => 'Failures',
          cellRenderer: ({ rowIndex }) => {
            const { failures } = callObjects[rowIndex]
            if (failures) {
              return h(FailuresViewer, { failures })
            } else {
              return div({ style: { color: colors.dark(0.7) } }, ['N/A'])
            }
          }
        },
        {
          size: { basis: 150, grow: 0 },
          headerRenderer: () => 'Links',
          cellRenderer: ({ rowIndex }) => {
            const { shardIndex, attempt } = callObjects[rowIndex]
            return h(Link, {
              href: Nav.getLink('workspace-call-details', { namespace, name, submissionId, workflowId, callFqn: callName, index: shardIndex, attempt }),
              style: { display: 'flex', alignItems: 'center' }
            }, [icon('fileCopy', { size: 18, marginRight: '0.5rem' }), ' Call Details'])
          }
        }
      ]
    }),
    wizardVisible && h(CallCacheWizard, {
      onDismiss: () => setWizardVisible(false),
      namespace, name, submissionId, workflowId, callFqn: 'foo', attempt: 100, index: 100
    })
  ])
}

export default CallTable
