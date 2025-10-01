#!/usr/bin/env python3
"""
Trusted Types Unsafe Endpoints Scanner

This script scans JavaScript files for potentially unsafe DOM manipulation
patterns that could violate Trusted Types policies when strict CSP is enabled.

Based on the Trusted Types specification, it looks for:
- innerHTML/outerHTML assignments
- insertAdjacentHTML calls
- document.write/writeln calls
- Range.createContextualFragment calls
- setAttribute calls with dangerous attributes
- eval, setTimeout, setInterval with string arguments
"""

import re
import sys
import json
from pathlib import Path
from typing import List, Dict, Tuple, Any

class TrustedTypesScanner:
    def __init__(self):
        # Define patterns for Trusted Types unsafe sinks
        self.patterns = {
            'innerHTML': {
                'pattern': r'\.innerHTML\s*=',
                'description': 'Direct innerHTML assignment - requires TrustedHTML',
                'severity': 'HIGH',
                'trusted_type': 'TrustedHTML'
            },
            'outerHTML': {
                'pattern': r'\.outerHTML\s*=',
                'description': 'Direct outerHTML assignment - requires TrustedHTML',
                'severity': 'HIGH',
                'trusted_type': 'TrustedHTML'
            },
            'insertAdjacentHTML': {
                'pattern': r'\.insertAdjacentHTML\s*\(',
                'description': 'insertAdjacentHTML call - requires TrustedHTML',
                'severity': 'HIGH',
                'trusted_type': 'TrustedHTML'
            },
            'document_write': {
                'pattern': r'document\.write(ln)?\s*\(',
                'description': 'document.write/writeln call - requires TrustedHTML',
                'severity': 'HIGH',
                'trusted_type': 'TrustedHTML'
            },
            'createContextualFragment': {
                'pattern': r'\.createContextualFragment\s*\(',
                'description': 'Range.createContextualFragment call - requires TrustedHTML',
                'severity': 'HIGH',
                'trusted_type': 'TrustedHTML'
            },
            'textContent': {
                'pattern': r'\.textContent\s*=',
                'description': 'textContent assignment - generally safe but flagged for review',
                'severity': 'LOW',
                'trusted_type': 'None (safe)'
            },
            'setAttribute_dangerous': {
                'pattern': r'\.setAttribute\s*\(\s*[\'"](?:src|href|action|formaction|onclick|onload|onerror|srcdoc)[\'"]',
                'description': 'setAttribute with potentially dangerous attributes',
                'severity': 'MEDIUM',
                'trusted_type': 'TrustedScriptURL/TrustedURL/TrustedScript'
            },
            'eval_call': {
                'pattern': r'\beval\s*\(',
                'description': 'eval() call - requires TrustedScript',
                'severity': 'CRITICAL',
                'trusted_type': 'TrustedScript'
            },
            'setTimeout_string': {
                'pattern': r'setTimeout\s*\(\s*[\'"`]',
                'description': 'setTimeout with string argument - requires TrustedScript',
                'severity': 'HIGH',
                'trusted_type': 'TrustedScript'
            },
            'setInterval_string': {
                'pattern': r'setInterval\s*\(\s*[\'"`]',
                'description': 'setInterval with string argument - requires TrustedScript',
                'severity': 'HIGH',
                'trusted_type': 'TrustedScript'
            },
            'Function_constructor': {
                'pattern': r'\bFunction\s*\(',
                'description': 'Function constructor - requires TrustedScript',
                'severity': 'HIGH',
                'trusted_type': 'TrustedScript'
            }
        }
        
        # Additional patterns for context analysis
        self.context_patterns = {
            'template_literal': r'`[^`]*\$\{[^}]*\}[^`]*`',
            'string_concatenation': r'[\'"][^\'"]*[\'"] \+ |[\'"][^\'"]*[\'"] \+= ',
            'variable_assignment': r'(\w+)\s*=\s*[\'"`][^\'"`]*[\'"`]'
        }

    def scan_file(self, file_path: str) -> List[Dict[str, Any]]:
        """Scan a single JavaScript file for Trusted Types violations."""
        findings = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"Error reading file {file_path}: {e}")
            return findings

        lines = content.split('\n')
        
        for pattern_name, pattern_info in self.patterns.items():
            matches = re.finditer(pattern_info['pattern'], content, re.IGNORECASE | re.MULTILINE)
            
            for match in matches:
                line_num = content[:match.start()].count('\n') + 1
                line_content = lines[line_num - 1].strip() if line_num <= len(lines) else ""
                
                # Get surrounding context (3 lines before and after)
                start_line = max(0, line_num - 4)
                end_line = min(len(lines), line_num + 3)
                context_lines = lines[start_line:end_line]
                context = '\n'.join(f"{start_line + i + 1:4d}: {line}" for i, line in enumerate(context_lines))
                
                finding = {
                    'file': file_path,
                    'line': line_num,
                    'column': match.start() - content.rfind('\n', 0, match.start()),
                    'pattern': pattern_name,
                    'severity': pattern_info['severity'],
                    'description': pattern_info['description'],
                    'trusted_type_required': pattern_info['trusted_type'],
                    'matched_text': match.group(0),
                    'line_content': line_content,
                    'context': context,
                    'start_pos': match.start(),
                    'end_pos': match.end()
                }
                
                # Add additional analysis
                finding['analysis'] = self._analyze_context(content, match, line_content)
                
                findings.append(finding)
        
        return findings

    def _analyze_context(self, content: str, match: re.Match, line_content: str) -> Dict[str, Any]:
        """Analyze the context around a match to provide additional insights."""
        analysis = {
            'likely_user_controlled': False,
            'has_sanitization': False,
            'in_function': None,
            'variable_source': None
        }
        
        # Check for common sanitization patterns
        sanitization_patterns = [
            r'DOMPurify\.sanitize',
            r'\.replace\([^)]*<script[^)]*\)',
            r'\.replace\([^)]*javascript:[^)]*\)',
            r'encodeURIComponent',
            r'encodeURI\(',
            r'escape\(',
        ]
        
        # Look in surrounding context (500 chars before and after)
        start = max(0, match.start() - 500)
        end = min(len(content), match.end() + 500)
        context = content[start:end]
        
        for pattern in sanitization_patterns:
            if re.search(pattern, context, re.IGNORECASE):
                analysis['has_sanitization'] = True
                break
        
        # Check if likely user-controlled input
        user_input_patterns = [
            r'\.value\b',
            r'\.textContent\b',
            r'\.innerText\b',
            r'prompt\(',
            r'location\.',
            r'window\.location',
            r'document\.location',
            r'\.search\b',
            r'\.hash\b',
            r'\.pathname\b',
            r'params\.',
            r'query\.',
            r'request\.',
            r'input\.',
            r'form\.',
        ]
        
        for pattern in user_input_patterns:
            if re.search(pattern, context, re.IGNORECASE):
                analysis['likely_user_controlled'] = True
                break
        
        # Try to find the containing function
        func_match = re.search(r'function\s+(\w+)\s*\([^)]*\)\s*\{[^}]*' + re.escape(match.group(0)), content)
        if func_match:
            analysis['in_function'] = func_match.group(1)
        
        return analysis

    def generate_report(self, findings: List[Dict[str, Any]], output_format: str = 'text') -> str:
        """Generate a report from the findings."""
        if output_format == 'json':
            return json.dumps(findings, indent=2)
        
        # Text report
        report = []
        report.append("=" * 80)
        report.append("TRUSTED TYPES UNSAFE ENDPOINTS SCAN REPORT")
        report.append("=" * 80)
        report.append(f"Total findings: {len(findings)}")
        report.append("")
        
        # Group by severity
        by_severity = {}
        for finding in findings:
            severity = finding['severity']
            if severity not in by_severity:
                by_severity[severity] = []
            by_severity[severity].append(finding)
        
        severity_order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
        
        for severity in severity_order:
            if severity in by_severity:
                report.append(f"\n{severity} SEVERITY ({len(by_severity[severity])} findings)")
                report.append("-" * 50)
                
                for finding in by_severity[severity]:
                    report.append(f"\n📍 {finding['file']}:{finding['line']}:{finding['column']}")
                    report.append(f"   Pattern: {finding['pattern']}")
                    report.append(f"   Description: {finding['description']}")
                    report.append(f"   Trusted Type Required: {finding['trusted_type_required']}")
                    report.append(f"   Matched: {finding['matched_text']}")
                    report.append(f"   Line: {finding['line_content']}")
                    
                    # Analysis
                    analysis = finding['analysis']
                    if analysis['likely_user_controlled']:
                        report.append("   ⚠️  Likely user-controlled input detected")
                    if analysis['has_sanitization']:
                        report.append("   ✅ Sanitization detected in context")
                    if analysis['in_function']:
                        report.append(f"   📋 In function: {analysis['in_function']}")
                    
                    report.append(f"\n   Context:")
                    for line in finding['context'].split('\n'):
                        report.append(f"   {line}")
                    report.append("")
        
        # Summary by pattern
        report.append("\nSUMMARY BY PATTERN")
        report.append("-" * 30)
        pattern_counts = {}
        for finding in findings:
            pattern = finding['pattern']
            if pattern not in pattern_counts:
                pattern_counts[pattern] = 0
            pattern_counts[pattern] += 1
        
        for pattern, count in sorted(pattern_counts.items(), key=lambda x: x[1], reverse=True):
            report.append(f"{pattern}: {count}")
        
        return '\n'.join(report)

def main():
    if len(sys.argv) < 2:
        print("Usage: python trusted_types_scanner.py <file_path> [--json]")
        print("Example: python trusted_types_scanner.py src/htmx.js")
        sys.exit(1)
    
    file_path = sys.argv[1]
    output_json = '--json' in sys.argv
    
    if not Path(file_path).exists():
        print(f"Error: File {file_path} not found")
        sys.exit(1)
    
    scanner = TrustedTypesScanner()
    findings = scanner.scan_file(file_path)
    
    output_format = 'json' if output_json else 'text'
    report = scanner.generate_report(findings, output_format)
    
    print(report)
    
    # Also save to file
    output_file = f"trusted_types_scan_results.{'json' if output_json else 'txt'}"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(f"\nReport saved to: {output_file}")

if __name__ == "__main__":
    main()