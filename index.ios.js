import React, { Component } from 'react';
import { AppRegistry } from 'react-native';

import Main from './src/Main';

export default class Chat extends Component {
  render() {
    return (
      <Main />
    );
  }
}

AppRegistry.registerComponent('Chat', () => Chat);
