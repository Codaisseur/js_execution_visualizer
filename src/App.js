import React from "react";
import styles from "./App.module.scss";
import Toolbar from "./components/Toolbar";
import ProjectInfo from "./components/ProjectInfo";
import VisualizedExecution from "./components/VisualizedExecution";

import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

export default function App() {
  return (
    <div className={styles.App}>
      <Router>
        <Toolbar />
        <Switch>
          <Route path="/info" component={ProjectInfo} />
          <Route component={VisualizedExecution} />
        </Switch>
      </Router>
    </div>
  );
}
