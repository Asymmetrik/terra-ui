import _ from 'lodash/fp'
import { Fragment, useRef, useState } from 'react'
import { div, h, hr, span } from 'react-hyperscript-helpers'
import ReactJson from 'react-json-view'
import Select from 'react-select'
import * as breadcrumbs from 'src/components/breadcrumbs'
import Collapse from 'src/components/Collapse'
import { ButtonPrimary, ButtonSecondary, ClipboardButton, Link } from 'src/components/common'
import ErrorView from 'src/components/ErrorView'
import { centeredSpinner, icon } from 'src/components/icons'
import { TextInput } from 'src/components/input'
import {
  breadcrumbHistoryCaret,
  callCacheWizardBreadcrumbSubtitle,
  collapseCromwellExecutionStatus, failedIcon, makeSection, makeStatusLine, runningIcon, statusIcon,
  submittedIcon, successIcon, unknownIcon, workflowDetailsBreadcrumbSubtitle
} from 'src/components/job-common'
import Modal from 'src/components/Modal'
import UriViewer from 'src/components/UriViewer'
import WDLViewer from 'src/components/WDLViewer'
import { Ajax } from 'src/libs/ajax'
import { bucketBrowserUrl } from 'src/libs/auth'
import { getConfig } from 'src/libs/config'
import { reportError } from 'src/libs/error'
import * as Style from 'src/libs/style'
import { codeFont, noWrapEllipsis } from 'src/libs/style'
import * as Utils from 'src/libs/utils'
import { wrapWorkspace } from 'src/pages/workspaces/workspace/WorkspaceContainer'


const CallCacheWizard = ({
  onDismiss, namespace, name, submissionId, workflowId, callFqn, attempt, index
}) => {
  /*
   * State setup
   */

  const [otherWorkflowId, setOtherWorkflowId] = useState()
  const [otherWorkflowMetadata, setOtherWorkflowMetadata] = useState()
  const [otherCallFqn, setOtherCallFqn] = useState()
  const [otherIndex, setOtherIndex] = useState()
  const [otherAttempt, setOtherAttempt] = useState()
  const [otherCallSelected, setOtherCallSelected] = useState(false)
  const [diff, setDiff] = useState()
  const [diffError, setDiffError] = useState()

  const signal = Utils.useCancellation()
  const stateRefreshTimer = useRef()

  /*
   * Data Fetchers
   */

  const readCalls = async otherWf => {
    const includeKey = [
      'end', 'start', 'executionStatus'
    ]
    const excludeKey = []
    // const wf = await Ajax(signal).Workspaces.workspace(otherNs, otherWs).submission(otherSub).getWorkflow(otherWf, includeKey, excludeKey)
    const wf = await Ajax(signal).CromIAM.workflowMetadata(otherWf, includeKey, excludeKey)
    setOtherWorkflowMetadata(wf)
  }

  const fetchDiff = async (otherWf, otherCall, otherIx) => {
    try {
      const diff = await Ajax(signal).CromIAM.callCacheDiff(workflowId, callFqn, Number(index), otherWf, otherCall, Number(otherIx))
      setDiff(diff)
    } catch (error) {
      console.log(error)
      if (error instanceof Response) setDiffError(await error.text())
      else if (_.isObject(error)) setDiffError(JSON.stringify(error))
      else setDiffError(error)
    }
  }

  const callFqnOptions = _.flow(
    _.keys,
    _.map(name => { return { value: name, label: name } })
  )

  const resetDiffResult = () => {
    setDiff(undefined)
    setDiffError(undefined)
  }

  const resetCallSelection = () => {
    setOtherCallFqn(undefined)
    setOtherIndex(undefined)
    setOtherAttempt(undefined)
    setOtherCallSelected(false)
    resetDiffResult()
  }

  const resetWorkflowSelection = () => {
    resetCallSelection()
    setOtherWorkflowId(undefined)
  }

  /*
   * Page render
   */

  const divider = hr({ style: { width: '100%', border: '1px ridge lightgray' } })

  const step1 = () => {
    return h(Fragment, [
      div({ style: { paddingTop: '0.5rem', fontSize: 16, fontWeight: 500, ...Style.noWrapEllipsis } }, ['Step 1: Select the workflow you expected to cache from']),
      div({ style: { marginTop: '0.5rem', marginBottom: '1rem', display: 'flex', flexDirection: 'row', alignItems: 'center' } }, [
        div({ style: { paddingRight: '0.5rem' } }, ['Workflow ID:']),
        div({ style: { paddingRight: '0.5rem', flex: '2 1 auto' } }, [h(TextInput, { style: Style.codeFont, id: 'otherWorkflowId' })]),
        div([h(ButtonPrimary, {
          style: { float: 'right' },
          onClick: () => {
            const otherWf = document.getElementById('otherWorkflowId').value
            setOtherWorkflowId(otherWf)
            readCalls(otherWf)
          }
        }, ['Continue >'])])
      ]),
      divider,
      div({ style: { paddingTop: '0.5rem', fontSize: 16, fontWeight: 500, color: 'lightgray', ...Style.noWrapEllipsis } }, ['Step 2: Select the call you expected to cache from']),
      divider,
      div({ style: { paddingTop: '0.5rem', fontSize: 16, fontWeight: 500, color: 'lightgray', ...Style.noWrapEllipsis } }, ['Result: View cache diff'])
    ])
  }
  const step2 = () => {
    const otherCallIndexSelector = (metadata, fqn) => {
      const shards = _.flow(
        _.map(c => Number(c.shardIndex)),
        _.uniq
      )(metadata.calls[fqn])

      if (shards.length === 1) {
        if (otherIndex !== shards[0]) { setOtherIndex(shards[0]) }
        if (shards[0] === -1) {
          return 'N/A (this call was not scattered)'
        } else {
          return `${shards[0]} (exactly one shard in the scatter)`
        }
      } else {
        const shardOptions = _.map(i => { return { value: i, label: i } }).apply(shards)
        return h(Select, { id: 'otherCallIndex', options: shardOptions, onChange: i => setOtherIndex(i) })
      }
    }

    const otherCallAttemptDecision = (metadata, fqn, index) => {
      const successfulAttempt = _.flow(
        _.filter(c => c.shardIndex === index && c.executionStatus === 'Done'),
        _.map(c => c.attempt),
        _.first
      )(metadata.calls[fqn])

      const unsuccessfulStatusesString = _.flow(
        _.filter(c => c.shardIndex === index && c.executionStatus !== 'Done'),
        _.map(c => `${c.attempt}: ${c.executionStatus}`),
        _.join(', ')
      )

      if (successfulAttempt) {
        if (otherAttempt !== successfulAttempt) setOtherAttempt(successfulAttempt)
        return `${successfulAttempt} (the first successful attempt of this call)`
      } else {
        return `This index of the call had 0 successful attempts. Attempt statuses were: ${unsuccessfulStatusesString(metadata.calls[fqn])}`
      }
    }

    return h(Fragment, [
      div({ style: { display: 'flex', alignItems: 'center', fontSize: 16, fontWeight: 500 } }, [
        div(['Step 1: Selected workflow B: ']),
        div({ style: { display: 'flex', flexDirection: 'row', alignItems: 'center', flex: '1 1 100px' } }, [
          div({ style: { marginLeft: '0.5rem', ...Style.noWrapEllipsis, ...Style.codeFont } }, otherWorkflowId)
        ]),
        h(ButtonSecondary, { style: { paddingLeft: '1rem', height: '20px', color: 'darkred', justifyContent: 'right' }, onClick: () => resetWorkflowSelection() }, ['[X]'])
      ]),
      divider,
      div({ style: { paddingTop: '0.5rem', fontSize: 16, fontWeight: 500, ...Style.noWrapEllipsis } }, ['Step 2: Select which call in that workflow you expected to cache from']),
      otherWorkflowMetadata ? div([
        div({ style: { marginTop: '1rem', display: 'flex', flexDirection: 'row', alignItems: 'center' } }, [
          div({ style: { paddingRight: '0.5rem' } }, ['Call FQN:']),
          div({ style: { paddingRight: '0.5rem', flex: '2 1 auto' } }, [
            h(Select, { id: 'otherCallFqn', options: callFqnOptions(otherWorkflowMetadata.calls), onChange: v => setOtherCallFqn(v.value) })
          ])
        ]),
        div({ style: { marginTop: '0.25rem', display: 'flex', flexDirection: 'row', alignItems: 'center' } }, [
          div({ style: { paddingRight: '0.5rem' } }, ['Shard Index:']),
          otherCallFqn ?
            div({ style: { paddingRight: '0.5rem', flex: '2 1 auto' } }, [otherCallIndexSelector(otherWorkflowMetadata, otherCallFqn)]) :
            'Select a call FQN first'
        ]),
        div({ style: { marginTop: '0.25rem', marginBottom: '1rem', display: 'flex', flexDirection: 'row', alignItems: 'center' } }, [
          div({ style: { paddingRight: '0.5rem' } }, ['Attempt:']),
          (!!otherCallFqn && otherIndex !== undefined) ?
            div({ style: { paddingRight: '0.5rem', flex: '2 1 auto' } }, [otherCallAttemptDecision(otherWorkflowMetadata, otherCallFqn, otherIndex)]) :
            'Select a call FQN and an index first'
        ]),
        !!(otherCallFqn && otherIndex !== undefined && otherAttempt !== undefined) && h(ButtonPrimary, { style: { float: 'right' }, onClick: () => { fetchDiff(otherWorkflowId, otherCallFqn, otherIndex); setOtherCallSelected(true) } }, ['Compare Diff >'])
      ]) : 'Loading other workflow calls...',
      divider,
      div({ style: { paddingTop: '0.5rem', fontSize: 16, fontWeight: 500, color: 'lightgray', ...Style.noWrapEllipsis } }, ['Result: View cache diff'])
    ])
  }

  const compareDiffs = () => {
    return h(Fragment, [
      div({ style: { display: 'flex', alignItems: 'center', fontSize: 16, fontWeight: 500 } }, [
        div(['Step 1: Selected workflow B: ']),
        div({ style: { display: 'flex', flexDirection: 'row', alignItems: 'center', flex: '1 1 100px' } }, [
          div({ style: { marginLeft: '0.5rem', ...Style.noWrapEllipsis, ...Style.codeFont } }, otherWorkflowId)
        ]),
        h(ButtonSecondary, { style: { paddingLeft: '1rem', height: '20px', color: 'darkred', justifyContent: 'right' }, onClick: () => resetWorkflowSelection() }, ['[X]'])
      ]),
      divider,
      div({ style: { display: 'flex', flexDirection: 'row', alignItems: 'center', fontSize: 16, fontWeight: 500 } }, [
        div(['Step 2: Selected call B: ']),
        div({ style: { display: 'flex', flexDirection: 'row', alignItems: 'center', flex: '1 1 100px' } }, [
          div({ style: { marginLeft: '0.5rem', ...Style.noWrapEllipsis, ...Style.codeFont } }, otherCallFqn),
          breadcrumbHistoryCaret,
          div({ style: { marginLeft: '0.5rem', ...Style.noWrapEllipsis, ...Style.codeFont } }, `index ${otherIndex}`),
          breadcrumbHistoryCaret,
          div({ style: { marginLeft: '0.5rem', ...Style.noWrapEllipsis, ...Style.codeFont } }, `attempt ${otherAttempt}`)
        ]),
        h(ButtonSecondary, { style: { justifyContent: 'right', paddingLeft: '1rem', height: '20px', color: 'darkred' }, onClick: () => resetCallSelection() }, ['[X]'])
      ]),
      divider,
      div({ style: { display: 'flex', alignItems: 'center', fontSize: 16, fontWeight: 500 } }, ['Result: View cache diff']),
      diffError ?
        h(ErrorView, { error: diffError }) :
        (diff ?
          [div({ style: { marginTop: '0.5rem', marginBottom: '0.5rem' } }, ['Note: the diff is expressed in terms of hashes of values rather than raw values because it is hashes that determine cache hits.']),
            h(ReactJson, {
              style: { whiteSpace: 'pre-wrap', border: 'ridge', padding: '0.5rem' },
              name: false,
              shouldCollapse: ({ name }) => { return name === 'callA' || name === 'callB' },
              enableClipboard: false,
              displayDataTypes: false,
              displayObjectSize: false,
              src: { hashDifferential: diff.hashDifferential, ...diff }
            })] :
          'Cache diff loading...')
    ])
  }

  const chooseStep = () => {
    if (!otherWorkflowId) {
      return step1()
    } else if (!otherCallSelected) {
      return step2()
    } else {
      return compareDiffs()
    }
  }

  return h(Modal, {
    title: 'Call Cache Debugging Wizard',
    onDismiss,
    width: '50%',
    showButtons: false,
    showX: true
  }, [
    div({ style: { padding: '1rem 2rem 2rem', flex: 1, display: 'flex', flexDirection: 'column' } }, [
      'Debugging cache miss for call A:',
      div({ style: { marginTop: '0.5rem', flex: 1, display: 'flex', alignItems: 'center', flexDirection: 'row' } }, [
        div({ style: { fontSize: 16, fontWeight: 500, ...Style.codeFont } }, [workflowId]), breadcrumbHistoryCaret,
        div({ style: { fontSize: 16, fontWeight: 500, ...Style.codeFont } }, [callFqn]),
        Number(index) >= 0 && h(Fragment, [breadcrumbHistoryCaret, 'index', div({ style: { marginLeft: '0.25rem', fontSize: 16, fontWeight: 500, ...Style.codeFont } }, [index])]),
        Number(attempt) > 1 && h(Fragment, [breadcrumbHistoryCaret, 'attempt', div({ style: { marginLeft: '0.25rem', fontSize: 16, fontWeight: 500, ...Style.codeFont } }, [attempt])])
      ]),
      divider,
      chooseStep()
    ])
  ])
}

export default CallCacheWizard
