import _ from 'lodash/fp'
import * as qs from 'qs'
import { Fragment, useEffect, useRef, useState } from 'react'
import { div, h, h2, p, span } from 'react-hyperscript-helpers'
import { ButtonPrimary, Clickable, IdContainer, Link, Select, spinnerOverlay } from 'src/components/common'
import FooterWrapper from 'src/components/FooterWrapper'
import { icon, spinner } from 'src/components/icons'
import { ValidatedInput } from 'src/components/input'
import Modal from 'src/components/Modal'
import { InfoBox } from 'src/components/PopupTrigger'
import TopBar from 'src/components/TopBar'
import { Ajax } from 'src/libs/ajax'
import * as Auth from 'src/libs/auth'
import colors from 'src/libs/colors'
import { withErrorReporting } from 'src/libs/error'
import { formHint, FormLabel } from 'src/libs/forms'
import * as Nav from 'src/libs/nav'
import * as StateHistory from 'src/libs/state-history'
import * as Style from 'src/libs/style'
import * as Utils from 'src/libs/utils'
import ProjectDetail from 'src/pages/billing/Project'
import validate from 'validate.js'


const ProjectTab = ({ project: { projectName, role, creationStatus, message }, isActive }) => {
  const projectReady = creationStatus === 'Ready'
  const statusIcon = creationStatus === 'Creating' ?
    spinner({ size: 16, style: { color: colors.accent(), margin: '0 1rem 0 0.5rem' } }) :
    h(InfoBox, {
      style: { color: colors.danger(), margin: '0 1rem 0 0.5rem' }, side: 'right'
    }, [div({ style: { wordWrap: 'break-word', whiteSpace: 'pre-wrap' } }, [message || 'Error during project creation.'])])

  return _.includes('Owner', role) && projectReady ?
    h(Clickable, {
      style: { ...Style.navList.item(isActive), color: colors.accent() },
      href: `${Nav.getLink('billing')}?${qs.stringify({ selectedName: projectName, type: 'project' })}`,
      hover: Style.navList.itemHover(isActive)
    }, [projectName, !projectReady && statusIcon]) :
    div({ style: { ...Style.navList.item(false), color: colors.dark() } }, [projectName, !projectReady && statusIcon])
}

const billingProjectNameValidator = existing => ({
  presence: { allowEmpty: false },
  length: { minimum: 6, maximum: 30 },
  format: {
    pattern: /^[a-z]([a-z0-9-])*$/,
    message: 'must start with a letter and can only contain lowercase letters, numbers, and hyphens.'
  },
  exclusion: {
    within: existing,
    message: 'already exists'
  }
})

const noBillingMessage = onClick => div({ style: { fontSize: 20, margin: '2rem' } }, [
  div([
    'To get started, ',
    h(Link, { onClick }, ['click here to create a Billing Project'])
  ]),
  div({ style: { marginTop: '1rem', fontSize: 16 } }, [
    h(Link, {
      ...Utils.newTabLinkProps,
      href: `https://support.terra.bio/hc/en-us/articles/360026182251`
    }, [`What is a billing project?`])
  ])
])

const NewBillingProjectModal = ({ onSuccess, onDismiss, billingAccounts, loadAccounts }) => {
  const [billingProjectName, setBillingProjectName] = useState('')
  const [billingProjectNameTouched, setBillingProjectNameTouched] = useState(false)
  const [existing, setExisting] = useState([])
  const [isBusy, setIsBusy] = useState(false)
  const [chosenBillingAccount, setChosenBillingAccount] = useState('')

  const submit = _.flow(
    withErrorReporting('Error creating billing project'),
    Utils.withBusyState(setIsBusy)
  )(async () => {
    try {
      await Ajax().Billing.createProject(billingProjectName, chosenBillingAccount.accountName)
      onSuccess()
    } catch (error) {
      if (error.status === 409) {
        setExisting(_.concat(billingProjectName, existing))
      } else {
        throw error
      }
    }
  })

  const errors = validate({ billingProjectName }, { billingProjectName: billingProjectNameValidator(existing) })

  return h(Modal, {
    onDismiss,
    shouldCloseOnOverlayClick: false,
    title: 'Create Billing Project',
    showCancel: !(billingAccounts && billingAccounts.length === 0),
    showButtons: !!billingAccounts,
    okButton: billingAccounts && billingAccounts.length !== 0 ?
      h(ButtonPrimary, {
        disabled: errors || !chosenBillingAccount || !chosenBillingAccount.firecloudHasAccess,
        onClick: () => submit()
      }, ['Create Billing Project']) :
      h(ButtonPrimary, {
        onClick: () => onDismiss()
      }, ['Ok'])
  }, [
    billingAccounts && billingAccounts.length === 0 && h(Fragment, [
      `You don't have access to any billing accounts.  `,
      h(Link, {
        href: `https://support.terra.bio/hc/en-us/articles/360026182251`,
        ...Utils.newTabLinkProps
      }, ['Learn how to create a billing account.', icon('pop-out', { size: 12, style: { marginLeft: '0.5rem' } })])
    ]),
    billingAccounts && billingAccounts.length !== 0 && h(Fragment, [
      h(IdContainer, [id => h(Fragment, [
        h(FormLabel, { htmlFor: id, required: true }, ['Enter name']),
        h(ValidatedInput, {
          inputProps: {
            id,
            autoFocus: true,
            value: billingProjectName,
            onChange: v => {
              setBillingProjectName(v)
              setBillingProjectNameTouched(true)
            }
          },
          error: billingProjectNameTouched && Utils.summarizeErrors(errors && errors.billingProjectName)
        })
      ])]),
      !(billingProjectNameTouched && errors) && formHint('Name must be unique and cannot be changed.'),
      h(IdContainer, [id => h(Fragment, [
        h(FormLabel, { htmlFor: id, required: true }, ['Select billing account']),
        div({ style: { fontSize: 14 } }, [
          h(Select, {
            id,
            isMulti: false,
            placeholder: 'Select billing account',
            value: chosenBillingAccount,
            onChange: ({ value }) => setChosenBillingAccount(value),
            options: _.map(account => {
              return {
                value: account,
                label: account.displayName
              }
            }, billingAccounts)
          })
        ])
      ])]),
      !!chosenBillingAccount && !chosenBillingAccount.firecloudHasAccess && div({ style: { fontWeight: 500, fontSize: 13 } }, [
        div({ style: { margin: '0.25rem 0 0.25rem 0', color: colors.danger() } },
          'Terra does not have access to this account. '),
        div({ style: { marginBottom: '0.25rem' } }, ['To grant access, add ', span({ style: { fontWeight: 'bold' } }, 'terra-billing@terra.bio'),
          ' as a ', span({ style: { fontWeight: 'bold' } }, 'Billing Account User'), ' on the ',
          h(Link, {
            href: `https://console.cloud.google.com/billing/${chosenBillingAccount.accountName.split('/')[1]}?authuser=${Auth.getUser().email}`,
            ...Utils.newTabLinkProps
          }, ['Google Cloud Console', icon('pop-out', { style: { marginLeft: '0.25rem' }, size: 12 })])]),
        div({ style: { marginBottom: '0.25rem' } }, ['Then, ',
          h(Link, { onClick: () => loadAccounts() }, ['click here']), ' to refresh your billing accounts.']),
        div({ style: { marginTop: '0.5rem' } }, [
          h(Link, {
            href: `https://support.terra.bio/hc/en-us/articles/360026182251`,
            ...Utils.newTabLinkProps
          }, ['Need help?', icon('pop-out', { style: { marginLeft: '0.25rem' }, size: 12 })])
        ])
      ])
    ]),
    (isBusy || !billingAccounts) && spinnerOverlay
  ])
}

export const BillingList = ({ queryParams: { selectedName } }) => {
  // State
  const [billingProjects, setBillingProjects] = useState(StateHistory.get().billingProjects || null)
  const [creatingBillingProject, setCreatingBillingProject] = useState(false)
  const [billingAccounts, setBillingAccounts] = useState(null)
  const [isOwner, setIsOwner] = useState(false)
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isAuthorizing, setIsAuthorizing] = useState(false)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)

  const signal = Utils.useCancellation()
  const interval = useRef()


  // Helpers
  const loadProjects = _.flow(
    withErrorReporting('Error loading billing projects list'),
    Utils.withBusyState(setIsLoadingProjects)
  )(async () => {
    const rawBillingProjects = await Ajax(signal).Billing.listProjects()
    const billingProjects = _.flow(
      _.groupBy('projectName'),
      _.map(gs => ({ ...gs[0], role: _.map('role', gs) })),
      _.sortBy('projectName')
    )(rawBillingProjects)
    setBillingProjects(billingProjects)
  })

  const authorizeAndLoadAccounts = _.flow(
    withErrorReporting('Error setting up authorization'),
    Utils.withBusyState(setIsAuthorizing)
  )(async () => {
    await Auth.ensureBillingScope()
    await loadAccounts()
  })

  const loadAccounts = _.flow(
    withErrorReporting('Error loading billing accounts'),
    Utils.withBusyState(setIsLoadingAccounts)
  )(async () => {
    if (Auth.hasBillingScope()) {
      setBillingAccounts(await Ajax(signal).Billing.listAccounts())
    }
  })

  const checkOwner = () => {
    !isOwner && _.map(project => _.includes('Owner', project.role) ? setIsOwner(true) : null, billingProjects)
  }

  const showCreateProjectModal = async () => {
    if (Auth.hasBillingScope()) {
      setCreatingBillingProject(true)
    } else {
      await authorizeAndLoadAccounts()
      Auth.hasBillingScope() && setCreatingBillingProject(true)
    }
  }


  // Lifecycle
  Utils.useOnMount(() => {
    loadProjects()
    loadAccounts()
    checkOwner()
  })

  useEffect(() => {
    const anyProjectsCreating = _.some({ creationStatus: 'Creating' }, billingProjects)

    if (anyProjectsCreating && interval.current) {
      interval.current = setInterval(loadProjects, 10000)
    } else if (!anyProjectsCreating && interval.current) {
      clearInterval(interval.current)
      interval.current = undefined
    }

    StateHistory.update({ billingProjects })

    return () => clearInterval(interval.current)
  })


  // Render
  const hasBillingProjects = !_.isEmpty(billingProjects)
  const breadcrumbs = `Billing > Billing Project`

  return h(FooterWrapper, [
    h(TopBar, { title: 'Billing' }, [
      !!selectedName && div({
        style: {
          color: 'white', paddingLeft: '5rem', minWidth: 0, marginRight: '0.5rem'
        }
      }, [
        div(breadcrumbs),
        div({ style: Style.breadcrumb.textUnderBreadcrumb }, [selectedName])
      ])
    ]),
    div({ role: 'main', style: { display: 'flex', flex: 1, position: 'relative' } }, [
      div({ style: { width: 330, boxShadow: '0 2px 5px 0 rgba(0,0,0,0.25)' } }, [
        div({ style: Style.navList.heading }, [
          'Billing Projects',
          h(Clickable, {
            'aria-label': 'Create new billing project',
            onClick: showCreateProjectModal
          }, [
            icon('plus-circle', { size: 21, style: { color: colors.accent() } })
          ])
        ]),
        _.map(project => h(ProjectTab, {
          project, key: project.projectName,
          isActive: !!selectedName && project.projectName === selectedName
        }), billingProjects)
      ]),
      creatingBillingProject && h(NewBillingProjectModal, {
        billingAccounts,
        loadAccounts,
        onDismiss: () => setCreatingBillingProject(false),
        onSuccess: () => {
          setCreatingBillingProject(false)
          loadProjects()
        }
      }),
      Utils.cond(
        [selectedName && hasBillingProjects && !_.some({ projectName: selectedName }, billingProjects),
          () => div({ style: { margin: '1rem auto 0 auto' } }, [
            h2(['Error loading selected billing project.']),
            p(['It may not exist, or you may not have access to it.'])
          ])],
        [selectedName && hasBillingProjects, () => h(ProjectDetail, {
          key: selectedName,
          project: _.find({ projectName: selectedName }, billingProjects),
          billingAccounts,
          authorizeAndLoadAccounts
        })],
        [isOwner && !selectedName && hasBillingProjects, () => div({ style: { margin: '1rem auto 0 auto' } }, ['Select a Billing Project'])],
        [!hasBillingProjects, () => noBillingMessage(showCreateProjectModal)]
      ),
      (isLoadingProjects || isAuthorizing || isLoadingAccounts) && spinnerOverlay
    ])
  ])
}


export const navPaths = [
  {
    name: 'billing',
    path: '/billing',
    component: BillingList,
    title: 'Billing'
  }
]
