import { Box, Text } from 'ink'
import BigText from 'ink-big-text'
import React from 'react'

export default function Init(): React.ReactElement {
    return (
        <Box flexDirection="column" padding={1}>
            <BigText
                text="regressionproof"
                font="tiny"
                colors={['magenta', 'cyan']}
            />
            <Text color="gray">Teaching LLM's to write better code.</Text>
        </Box>
    )
}
