import {connect} from 'react-redux';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Radium from 'radium';
import * as R from 'ramda';
import uniqid from 'uniqid';
import { onError, resolveError, revert } from '../../actions';
import ComponentErrorOverlay from './ComponentErrorOverlay.react';
import ComponentDisabledOverlay from './ComponentDisabledOverlay.react';

class UnconnectedComponentErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      myID: props.componentId,
      myUID: uniqid(),
      oldChildren: (<div>No Initial State</div>)
    };
  }

  componentDidCatch(error, info) {
    const { id, dispatch, children } = this.props;
    dispatch(onError({
      myUID: this.state.myUID,
      myID: this.state.myID,
      type: 'frontEnd',
      error,
      info
    }));
    dispatch(revert());
  }

  getDisabledComponents(disabledIds, incomingMap) {
    const possibleKeys = R.keys(incomingMap);
    const enumeratedPossibleIds = R.zip(
      R.range(0, R.length(possibleKeys)),
      R.map((k) => k.split('.')[0], possibleKeys)
    )
    const affectedIndices = R.filter(
      (idx) => !R.isNil(idx),
      R.map(
        (tuple) => R.contains(tuple[1], disabledIds) ? tuple[0] : null,
        enumeratedPossibleIds
      )
    );
    const affectedKeys = R.ap(
      R.map(
        R.nth,
        affectedIndices
      ),
      R.of(possibleKeys)
    );
    const disabledKeys = R.flatten(R.map((key) => incomingMap[key],
                                   affectedKeys));
    const newDisabledIds = R.union(
      disabledIds,
      R.map((k) => k.split('.')[0], disabledKeys)
    );
    if (R.equals(disabledIds, newDisabledIds)) {
      return disabledIds;
    } else {
      return this.getDisabledComponents(newDisabledIds, incomingMap);
    }
  }

  resolveError(dispatch, myUID) {
    dispatch(resolveError({type: 'frontEnd', myUID}))
  }

  render() {
    const {
      componentType,
      componentId,
      dispatch,
      error,
      graphs
    } = this.props;
    const { myID, myUID } = this.state;
    const hasError = R.contains(myUID, R.pluck('myUID')(error.frontEnd));
    const disabledComponents = this.getDisabledComponents(
      R.pluck('myID')(error.frontEnd),
      graphs.InputGraph.incomingEdges
    )
    const disabled = R.contains(componentId, disabledComponents);
    if ( hasError ) {
      const errorToDisplay = R.find(
        R.propEq('myUID', myUID)
      )(error.frontEnd).error;
      return (
        <ComponentErrorOverlay
           error={errorToDisplay}
           componentId={componentId}
           componentType={componentType}
           resolve={() => this.resolveError(dispatch, myUID)}
        />
      )
    } else if ( disabled ) {
      return (
        <ComponentDisabledOverlay>
          {this.props.children}
        </ComponentDisabledOverlay>
      )
    }
    return this.props.children;
  }
}

UnconnectedComponentErrorBoundary.propTypes = {
    children: PropTypes.object,
    componentId: PropTypes.string,
    componentType: PropTypes.string,
    dispatch: PropTypes.func
}

const ComponentErrorBoundary = connect(
    state => ({
      error: state.error,
      graphs: state.graphs
    }),
    dispatch => ({dispatch})
)(Radium(UnconnectedComponentErrorBoundary));

export default ComponentErrorBoundary;
