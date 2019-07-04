import React from "react"
import "./App.css"
import Table from "./Table.js"
import Map from './Map.js'
import PdfViewer from './Document.js'
import {handsOnTableToHandsOnTable} from 'datapackage-render'

function App(props) {
  let _data = props.view ? props.view.resources[0].data : null
  
  if (props.view.specType === 'table' && _data) {
    let view = props.view || {} // default to single table view
    if (view.resources) view.resources[0]._values =  _data
    let {data, ...options} = handsOnTableToHandsOnTable(view)
    return (
      <div className="App">
        <div className="container m-24">
          <Table data={data} options={options} />
        </div>
      </div>
    )
  } else if (props.view.specType === 'map' && _data && _data.type) {
    return (
      <div className="App">
        <div className="container m-24">
          <Map featureCollection={_data} />
        </div>
      </div>
    )
  } else if (props.view.specType === 'document') {
    return (
      <div className="App">
        <div className="container m-24">
          <PdfViewer file={props.view.resources[0].path} />
        </div>
      </div>
    )
  } else if (props.view.resources[0].unavailable) {
    return (
      <div className="App">
        <div className="container m-24">
          <p>Data view unavailable.</p>
          <a href={props.view.resources[0].path} className="text-primary font-bold">Download the data.</a>
        </div>
      </div>
    )
  } else {
    return (
      <div className="App">
        <div className="container m-24"><p>Data view is loading</p></div>
      </div>
    )
  }
}

export default App
