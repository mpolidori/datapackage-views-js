// react-testing-library renders your components to document.body,
// this will ensure they're removed after each test.
import '@testing-library/react/cleanup-after-each';
// this adds jest-dom's custom assertions
import 'jest-dom/extend-expect';
// Mock Chart component as Plotly lib errors when trying to run Jest tests:
// TypeError: Cannot read property 'document' of undefined
import React from 'react'
jest.mock('./Chart.js', () => (props) => {
  if (props.spec && props.spec.data && props.spec.layout) {
    return (<div>Stubbed Chart</div>)
  }
  return (<div>Wrong Chart</div>)
})
