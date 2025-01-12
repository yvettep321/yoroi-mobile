// @flow

import React from 'react'
import {View, ScrollView} from 'react-native'
import {injectIntl, type IntlShape} from 'react-intl'

import {Text, Button} from '../UiKit'
import {confirmationMessages} from '../../i18n/global-messages'

import styles from './styles/TwoActionView.style'
import {type PressEvent} from 'react-native/Libraries/Types/CoreEventTypes'

type Props = {|
  +intl: IntlShape,
  +title: string,
  +children: React$Node,
  +primaryButton: {|
    +label: string,
    +onPress: (event: PressEvent) => PossiblyAsync<void>,
  |},
  +secondaryButton?: {|
    label?: string,
    onPress: (event: PressEvent) => void,
  |},
|}

const TwoActionView = ({intl, title, children, primaryButton, secondaryButton}: Props) => (
  <ScrollView style={styles.scrollView} keyboardShouldPersistTaps={'always'}>
    <View style={styles.content}>
      <View style={styles.heading}>
        <Text style={styles.titleText}>{title}</Text>
      </View>
      {children}
    </View>
    <View style={styles.buttons}>
      {secondaryButton != null && (
        <Button
          outlineOnLight
          block
          onPress={secondaryButton.onPress}
          title={secondaryButton.label ?? intl.formatMessage(confirmationMessages.commonButtons.cancelButton)}
          style={styles.secondaryButton}
        />
      )}
      <Button block onPress={primaryButton.onPress} title={primaryButton.label} style={styles.primaryButton} />
    </View>
  </ScrollView>
)

export default injectIntl(TwoActionView)
