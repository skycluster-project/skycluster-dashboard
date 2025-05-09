import SyntaxHighlighter from 'react-syntax-highlighter';
// import {lightfair as theme} from 'react-syntax-highlighter/dist/esm/styles/hljs';
// import {monoBlue as theme} from 'react-syntax-highlighter/dist/esm/styles/hljs';
import {atomOneDark as theme} from 'react-syntax-highlighter/dist/esm/styles/hljs';
import YAML from 'yaml'
import {K8sResource} from "../types.ts";
import Box from "@mui/material/Box";

const YAMLCodeBlock = ({obj}: { obj: K8sResource }) => {
    if (obj.metadata.managedFields) {
        obj.metadata.managedFields = undefined
    }

    const lastApplied="kubectl.kubernetes.io/last-applied-configuration"
    if (obj.metadata.annotations && obj.metadata.annotations[lastApplied]) {
         delete obj.metadata.annotations[lastApplied]
    }

    return (
        <Box className="border">
            <SyntaxHighlighter language="yaml" style={theme} wrapLines={false} wrapLongLines={false}
                               showLineNumbers={true} lineNumberStyle={{color: "silver"}}
                               customStyle={{fontSize: '0.85em'}}>
                {YAML.stringify(obj)}
            </SyntaxHighlighter>
        </Box>
    );
};

export default YAMLCodeBlock