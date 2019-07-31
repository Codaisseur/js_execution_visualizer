import React from "react";
import cx from "classnames";
import useReactRouter from "use-react-router";
import { Link } from "react-router-dom";
import styles from "./Toolbar.module.scss";

export default function Toolbar() {
  const { location } = useReactRouter();

  const atInfoPage = location.pathname !== "/";

  return (
    <div className={styles.Toolbar}>
      <h1>
        Visualizing JavaScript execution{" "}
        <em>
          &mdash; <span style={{ whiteSpace: "nowrap" }}>a teaching</span>{" "}
          purposes experiment
        </em>{" "}
        <Link
          className={cx(styles.InfoIcon, atInfoPage && styles.atInfoPage)}
          to={atInfoPage ? "/" : "/info"}
        >
          <span>i</span>
        </Link>
      </h1>
    </div>
  );
}
