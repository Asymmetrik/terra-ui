import _ from 'lodash/fp'
import { Fragment, useState } from 'react'
import { div, h, span } from 'react-hyperscript-helpers'
import { IdContainer, LabeledCheckbox, RadioButton } from 'src/components/common'
import { IntegerInput, TextInput } from 'src/components/input'
import Modal from 'src/components/Modal'
import { FormLabel } from 'src/libs/forms'


const CatalogDatasetModal = ({ onDismiss, workspace }) => {
  const [datasetName, setDatasetName] = useState('')
  const [datasetVersion, setDatasetVersion] = useState('')
  const [datasetDescription, setDatasetDescription] = useState('')
  const [datasetCustodian, setDatasetCustodian] = useState('')
  const [datasetDepositor, setDatsetDespositor] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [datasetOwner, setDatasetOwner] = useState('')
  const [institute, setInstitute] = useState([])
  const [indication, setIndication] = useState('')
  const [numSubjects, setNumSubjects] = useState(0)
  const [projectName, setProjectName] = useState('')
  const [dataCategory, setDataCategory] = useState([])
  const [dataType, setDataType] = useState([])
  const [dataUseRestriction, setDataUseRestriction] = useState('')
  const [studyDesign, setStudyDesign] = useState('')
  const [requiresExternalApproval, setRequiresExternalApproval] = useState(false)
  const [useLimitationOption, setUseLimitationOption] = useState('')

  const makeTextInput = (inputLabel, value, onChange, isRequired = false) => h(IdContainer, [
    id => h(Fragment, [
      h(FormLabel, { htmlFor: id }, [inputLabel]),
      h(TextInput, { value, onChange })
    ])
  ])

  const makeBooleanInput = (inputLabel, checked, onChange) => h(FormLabel, [
    h(LabeledCheckbox, { checked, onChange }, [span({
      style: { paddingLeft: '0.5rem' }
    }, [inputLabel])])
  ])

  const makeIntInput = (inputLabel, min, value, onChange) => h(IdContainer, [
    id => h(Fragment, [
      h(FormLabel, { htmlFor: id }, [inputLabel]),
      h(IntegerInput, { min, value, onChange })
    ])
  ])

  const makeRadioInput = (inputLabel, value, options, onChange) => div([
    h(FormLabel, [inputLabel]),
    h(Fragment, _.map(({ optLabel, optValue }) => div([h(RadioButton, {
      onChange: () => onChange(optValue),
      checked: value === optValue,
      text: optLabel
    })]), options))
  ])

  return h(Modal, {
    onDismiss,
    title: 'Catalog Dataset'
  }, [
    makeTextInput('Cohort Name', datasetName, setDatasetName),
    makeTextInput('Dataset Version', datasetVersion, setDatasetVersion),
    makeTextInput('Cohort Description', datasetDescription, setDatasetDescription),
    makeTextInput('Dataset Owner', datasetOwner, setDatasetOwner),
    makeTextInput('Dataset Custodian', datasetCustodian, setDatasetCustodian),
    makeTextInput('Dataset Depositor', datasetDepositor, setDatsetDespositor),
    makeTextInput('Contact Email', contactEmail, setContactEmail),
    makeTextInput('Research Institute', institute, setInstitute),
    makeTextInput('Cohort Phenotype/Indication', indication, setIndication),
    // Primary Disease Site
    makeIntInput('No. of Subjects', 0, numSubjects, setNumSubjects),
    makeTextInput('Project Name', projectName, setProjectName),
    makeTextInput('Data Category', dataCategory, setDataCategory),
    makeTextInput('Experimental Strategy', dataType, setDataType),
    //Genome Reference Version
    // Data File Formats
    // Profiling instrument type
    // Profiling Protocol
    /// Depth of Sequencing Coverage (Average)
    makeTextInput('Data Use Limitation', dataUseRestriction, setDataUseRestriction),
    makeTextInput('Study Design', studyDesign, setStudyDesign),
    // cell type
    // Reported Ethnicity
    // Cohort Country of Origin
    makeBooleanInput('Requires External Approval', requiresExternalApproval, setRequiresExternalApproval),
    // Data Access Instructions
    makeRadioInput('Choose one of the available options to define Data Use Limitations', useLimitationOption, [
      { optValue: 'questionnaire', optLabel: 'Set Data Use Limitations by answering a questionnaire' },
      { optValue: 'orsp', optLabel: 'Retrieve Data Use Limitations from Broad ORSP' },
      { optValue: 'skip', optLabel: 'I would like to skip this step' }
    ], setUseLimitationOption)

  ])
}

export default CatalogDatasetModal
