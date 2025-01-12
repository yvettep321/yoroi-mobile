// @flow

import React from 'react'
import {SafeAreaView} from 'react-native-safe-area-context'
import {useSelector, useDispatch} from 'react-redux'
import {injectIntl, defineMessages, type IntlShape} from 'react-intl'
import {useNavigation, useRoute} from '@react-navigation/native'

import PinRegistrationForm from '../Common/PinRegistrationForm'
import {encryptAndStoreCustomPin, signin} from '../../actions'
import {isAuthenticatedSelector} from '../../selectors'
import {StatusBar} from '../UiKit'

import styles from './styles/CustomPinScreen.style'

const messages = defineMessages({
  pinInputTitle: {
    id: 'components.firstrun.custompinscreen.pinInputTitle',
    defaultMessage: '!!!Enter the PIN',
  },
  pinInputSubtitle: {
    id: 'components.firstrun.custompinscreen.pinInputSubtitle',
    defaultMessage: '!!!Choose new PIN for quick access to wallet.',
  },
  pinConfirmationTitle: {
    id: 'components.firstrun.custompinscreen.pinConfirmationTitle',
    defaultMessage: '!!!Repeat PIN',
  },
})

type Props = {
  intl: IntlShape,
}

const CustomPinScreen = ({intl}: Props) => {
  const isAuth = useSelector(isAuthenticatedSelector)
  const navigation = useNavigation()
  const route = useRoute()
  const onSuccess: () => any = (route.params?.onSuccess: any)
  const dispatch = useDispatch()
  const handlePinEntered = async (pin) => {
    await dispatch(encryptAndStoreCustomPin(pin))
    if (!isAuth) dispatch(signin()) // because in first run user is not authenticated
    if (onSuccess !== undefined) onSuccess()
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.container} testID="customPinContainer">
      <StatusBar type="dark" />

      <PinRegistrationForm
        onPinEntered={handlePinEntered}
        labels={{
          PinInput: {
            title: intl.formatMessage(messages.pinInputTitle),
            subtitle: intl.formatMessage(messages.pinInputSubtitle),
          },
          PinConfirmationInput: {
            title: intl.formatMessage(messages.pinConfirmationTitle),
          },
        }}
        navigation={navigation}
      />
    </SafeAreaView>
  )
}

export default injectIntl(CustomPinScreen)
