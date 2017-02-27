import React from 'react';
import { View, Text, StyleSheet, Platform, ActionSheetIOS, TouchableOpacity } from 'react-native';
import firebase from 'firebase';
import { GiftedChat } from 'react-native-gifted-chat';
import Icon from 'react-native-vector-icons/FontAwesome';
import ImagePicker from 'react-native-image-picker';
import { RNS3 } from 'react-native-aws3';
import ImageResizer from 'react-native-image-resizer';

const options = {
  // customButtons: [
  //   {name: 'fb', title: 'Choose Photo from Facebook'},
  // ],
  storageOptions: {
    skipBackup: true,
    path: 'images'
  }
};

class Main extends React.Component {
  constructor(props, context) {
    super(props, context);

    if (firebase.apps.length === 0) {
        firebase.initializeApp({
          apiKey: '',
          authDomain: '',
          databaseURL: '',
          storageBucket: '',
          messagingSenderId: ''
        });
    }

    this.userId = '1'; //ADD YOUR CUSTOM USER ID

    this.state = { messages: [], capturedImagePath: null };
    this.onSend = this.onSend.bind(this);
    this.renderAddImage = this.renderAddImage.bind(this);
    this.actionSheet = this.actionSheet.bind(this);

    this.firebaseMessages = firebase.database()
    .ref('messages/MESSAGE{1}'); //find a way to get unique
  }

  componentWillMount() {
    //listener live updates

    this.firebaseMessages.on('child_added', (child) => {
      //determine sent or received message
      //const sendOrReceived = (child.val().userId === this.userId) ? 1 : 2;

      this.handleReceive({
        _id: child.key,
        text: child.val().text,
        createdAt: new Date(child.val().date),
        user: {
          _id: child.val().userId,
          name: child.val().name
          //avatar: child.val().image
        },
        image: (child.val().image === '') ? null : child.val().image
      });
    });
  }

  onSend(messages = [], imageFile = '') {
      this.firebaseMessages.push({
        text: (messages === null) ? '' : messages[0].text,
        name: 'Sam', //USER NAME
        userId: this.userId,
        date: Date.now(),
        image: (imageFile === '') ? '' : imageFile
      }).then(() => {

      }, (error) => {

      });
  }

  setMessages(messages) {
    this.conversation = messages;
    const buffer = messages;
    this.setState({
      messages: buffer
    });
  }

  handleReceive(message = {}) {
      this.setState((previousState) => {
        return {
          messages: GiftedChat.append(previousState.messages, message),
        };
      });
  }

  actionSheet() {
    ImagePicker.showImagePicker(options, (response) => this.imagePicker(response));
  }

  imagePicker(response) {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
      } else if (response.customButton) {
        console.log('User tapped custom button: ', response.customButton);
      } else {

        let source;

        source = { uri: 'data:image/jpeg;base64,' + response.data };
        // Or a reference to the platform specific asset location
        if (Platform.OS === 'android') {
          source = { uri: response.uri };
        } else {
          source = { uri: response.uri.replace('file://', '') };
        }

        //Rezise the image to make it less data intensive

        ImageResizer.createResizedImage(source.uri, 600, 600, 'JPEG', 90)
        .then((resizedImageUri) => this.uploadToS3(resizedImageUri))
        .catch((err) => {
          // console.log(err);
          // this.setState({ capturedImagePath: '' });
        });
      }
  }

  uploadToS3(resizedImageUri) {
      console.log('resizedImageUri');
      console.log(resizedImageUri);
      //Get the image format (Probably a better way to do this)
      let extension = resizedImageUri.substr(resizedImageUri.lastIndexOf('.') + 1);

      //Make jpg => jpeg
      extension = (extension === 'jpg') ? 'jpeg' : 'png';

      const imageName = resizedImageUri.substr(resizedImageUri.lastIndexOf('/') + 1);

      const uploadFile = {
        // `uri` can also be a file system path (i.e. file://)
        uri: resizedImageUri,
        name: imageName,
        type: `image/${extension}`
      };
      //
      //console.log(uploadFile);

      const optionsS3 = {
        keyPrefix: '',
        bucket: '',
        region: '',
        accessKey: '',
        secretKey: '',
        successActionStatus:
      };

      RNS3.put(uploadFile, optionsS3)
      .then(responseS3 => this.onSend(null, responseS3.body.postResponse.location))
      .progress((e) => {

      });
  }

  renderAddImage() {
    let icon = (Platform.OS === 'ios') ? 'image' : 'image';
    return (
      <View>
        <TouchableOpacity onPress={this.actionSheet}>
          <Icon name={icon} size={33} color="#009688" style={{ padding: 5 }} />
        </TouchableOpacity>
      </View>
    );
  }

  render() {
    return (
      <View style={styles.container}>
        <GiftedChat
          messages={this.state.messages}
          onSend={this.onSend}
          user={{
            _id: this.userId,
          }}
          keyboardShouldPersistTaps='always'
          renderActions={this.renderAddImage}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF'
  },
  textInput: {
    backgroundColor: '#fff',
    borderColor: '#000',
    borderWidth: 1,
    height: 46,
    paddingLeft: 10
  }
});

export default Main;
