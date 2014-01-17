function loadTreeFromFile(filePath, selectedTestsTextBoxName,
		testsTreeContainerName, fields) {
	if(filePath == null ) {
		return;
	}
			
	fields.selectedTestsTextBox = $get(selectedTestsTextBoxName);
	fields.testsTreeContainer = $get(testsTreeContainerName);
	
	TestExecuterRPC.loadPropertiesFile(filePath, function(t) {
		 loadTreeFromProperties(t.responseObject(), fields);
	});
}

function overrideSettings(properties, fields) {
	for(var key in fields) {
		if(fields[key] != null) {
			properties[key] = fields[key];
		}
	}
}

function loadTreeFromProperties(propertiesFileContent, fields) {
	if(propertiesFileContent == null) {
		fields.testsTreeContainer.innerHTML = "File not exist or could not open file";
		return;
	}
	
	if(propertiesFileContent.length == 0) {
		fields.testsTreeContainer.innerHTML = "File is empty";
		return;
	}
	
	var properties = readPropertiesData(propertiesFileContent);
	overrideSettings(properties, fields);
	
	parseProperties(properties);

	properties.testsTreeContainer = fields.testsTreeContainer;
	properties.selectedTestsTextBox = fields.selectedTestsTextBox;
	properties.selectedTests = {};
	
	properties.addSelectedTest = function(testIndex, dontCommit) {
		this.selectedTests[testIndex] = this.tests[testIndex];
		if(!dontCommit) {
			this.commitSelected();
		}
	};
	
	properties.removeSelectedTest = function(testIndex, dontCommit) {
		delete this.selectedTests[testIndex];
		if(!dontCommit) {
			this.commitSelected();
		}
	};
	
	properties.commitSelected = function() {
		var result = ""
		for(var i in this.selectedTests) {
			if(result != "") {
				result += ",";
			}
			
			result += JSON.stringify(this.selectedTests[i]);
		}
		
		this.selectedTestsTextBox.value = "[" + result + "]";
	};
	
	loadTree(properties);
}

function commaSeperatedToArray(str) {
	if(!str) {
		return [];
	}
	
	var result = str.split(",");
	for(var i=0; i < result.length; ++i) {
		result[i] = result[i].trim();
	}
	return result;
}

function readPropertiesData(propertiesData) {
	return parseData(propertiesData);
}

function parseProperties(properties) {
	if(!properties.tests || properties.tests.length == 0) {
		properties.tests = [];
	} else {
		properties.tests = JSON.parse(properties.tests);
	}
	properties.showFields = commaSeperatedToArray(properties.showFields);
	
	if(!properties.enableField) {
		properties.enableField = "";
	} else {
		properties.enableField = properties.enableField.trim();
	}
	
	if(!properties.groupBy) {
		properties.groupBy = "";
	} else {
		properties.groupBy = properties.groupBy.trim();
	}
	
	if(!properties.fieldSeparator) {
		properties.fieldSeparator = "";
	} else {
		properties.fieldSeparator = properties.fieldSeparator.trim();
	}
	
	if(!properties.multiplicityField) {
		properties.multiplicityField = "";
	} else {
		properties.multiplicityField = properties.multiplicityField.trim();
	}
	
	properties.tests = properties.tests.sort(getTestComperator(properties.showFields));
	properties.groupsMap = getGroups(properties);
	properties.groups = getSortedGroups(properties.groupsMap);
}

function getSortedGroups(groupsMap) {
	var groups = [];
	
	for(var key in groupsMap) {
		groups.push(key);
	}
	
	groups.sort(function (a,b) {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});
	
	return groups;
}

function getGroups(properties) {
	var result = {};
	var tests = properties.tests;
	
	for (var i = 0; i < tests.length; ++i) {
		var test = tests[i];
		var enabledField = test[properties.enableField];
		
		var enabled = true;
		if(enabledField) {
			enabled = Boolean(test[properties.enableField]);
		}

		if (!enabled) {
			continue;
		}

		var key = test[properties.groupBy];
		if(!key) {
			key = "UNGROUPED";
		}
		
		if(!result[key]) {
			result[key] = {};
		}
		
		result[key][i] = test;
	}
	
	return result;
}

/**
 * Renders the tree
 * @param properties
 * @param testsTreeContainer
 */
function loadTree(properties) {
	// These are the fields in properties:
	// testsArray, enableField, groupBy, fieldSeparator, showFields
	
	for(var i=0; i < properties.groups.length; ++i) {
		var groupName = properties.groups[i];
		var groupTests = properties.groupsMap[groupName];
		
		createGroup(groupName, groupTests, properties);
	}
	
	properties.commitSelected();
}

function createGroup(groupName, groupTests, properties) {
	var groupDiv = document.createElement('div');
	groupDiv.className = "group";
	groupDiv.setAttribute("name",groupName);
	
	var plusButton = document.createElement('span');
	plusButton.className = "tree-button button-expand";
	plusButton.checked = false;
	plusButton.onclick = function() {
		showHideGroup(groupDiv, plusButton);
	};
	
	var groupCheck = document.createElement('input');
	groupCheck.type = "checkbox";
	groupCheck.setAttribute("name",groupName);
	groupCheck.onclick = function(event) {
		setGroup(groupDiv, groupCheck);
		properties.commitSelected();
	};
	
	var groupTitle = document.createElement('span');
	groupTitle.innerHTML = groupName;
	
	var groupTitleDiv = document.createElement('div');
	groupTitleDiv.appendChild(plusButton);
	groupTitleDiv.appendChild(groupCheck);
	groupTitleDiv.appendChild(groupTitle);
	groupTitleDiv.className = "groupTitle";
	properties.testsTreeContainer.appendChild(groupTitleDiv);

	var groupState = {
		selectedCounter: 0,
		size: Object.keys(groupTests).length,
		inc: function() {
			++this.selectedCounter;
			this.refreshState();
		},
		dec: function() {
			--this.selectedCounter;
			this.refreshState();
		},
		refreshState: function() {
			groupCheck.checked = this.selectedCounter == this.size;
		}
	};
	
	for(var i in groupTests) {
		createTest(groupDiv, groupTests[i], i, groupState, properties);
	}
	
//	if(groupState.selectedCounter > 0) {
//		showHideGroup(groupDiv, plusButton);
//	}
	
	properties.testsTreeContainer.appendChild(groupDiv);
}

function getMultiplicityAsInt(value) {
	var asNumber = Number(value);
	if(isNaN(asNumber) || asNumber < 1) {
		return 0;
	}
	
	return parseInt(asNumber);
}

function createTest(groupContainer, test, testIndex, groupState, properties) {
	var testCheck = document.createElement('input');
	testCheck.type = "checkbox";
	testCheck.checked = true;
	
	var testName = getShowString(test, properties);
	
	testCheck.setAttribute("name",testName);
	
	testCheck.onclick = function(event) {
		if(testCheck.checked) {
			groupState.inc();
		} else {
			groupState.dec();
		}
		
		selectTest(testIndex, event ? false : true, testCheck.checked, properties);
	};
	
	if(testCheck.checked) {
		groupState.inc();
		selectTest(testIndex, true, testCheck.checked, properties);
	}
	
	var currentMulti = getMultiplicityAsInt(test[properties.multiplicityField]);
	
	if(currentMulti < 1) {
		test[properties.multiplicityField] = 1;
	}
	
	var multi = document.createElement('input');
	multi.value = test[properties.multiplicityField];
	multi.type = "text";
	multi.className = "multiplicityInput";
	multi.style.backgroundColor = "#FFF";
	
	multi.onchange = function() {
		var input = getMultiplicityAsInt(multi.value);
		
		if(input < 1) {
			multi.style.backgroundColor = "#F99";
			input = 1;
		} else {
			multi.style.backgroundColor = "#FFF";
		}
		
		test[properties.multiplicityField] = input;
		properties.commitSelected();
	}
	
	var testTitle = document.createElement('span');
	testTitle.style.paddingLeft = "5px";
	testTitle.innerHTML = testName;
	
	var testDiv = document.createElement('div');
	testDiv.appendChild(testCheck);
	testDiv.appendChild(multi);
	testDiv.appendChild(testTitle);
	groupContainer.appendChild(testDiv);
}

function selectTest(testIndex, dontCommit, select, properties) {
	if(select) {
		properties.addSelectedTest(testIndex, dontCommit);
	} else {
		properties.removeSelectedTest(testIndex, dontCommit);
	}
}

function getShowString(test, properties) {
	var result = "";
	
	var showFields = properties.showFields;
	var fieldSeparator = properties.fieldSeparator;
	
	for (var i = 0; i < showFields.length; ++i) {
		var fieldValue = test[showFields[i]];
		if (fieldValue == null || fieldValue.length == 0) {
			fieldValue = "NULL";
		}

		if (i > 0) {
			result += fieldSeparator;
		}

		result += fieldValue;
	}
	
	return result;
}

function getTestComperator(fieldsToShow) {
	return function compareTest(test1, test2) {
		for (var i=0; i < fieldsToShow.length; ++i) {
			var fieldValue1 = test1[fieldsToShow[i]],
				fieldValue2 = test2[fieldsToShow[i]];
			
			if (fieldValue1 != null && fieldValue2 != null) {
				if (fieldValue1 == fieldValue2) {
					continue;
				} else {
					return fieldValue1.toLowerCase().localeCompare(fieldValue2.toLowerCase());
				}
			} else if (fieldValue1 == null && fieldValue2 == null) {
				continue;
			} else {
				if (fieldValue1 == null) {
					return 1;
				} else {
					return -1;
				}
			}
		}
	
		return 0;
	};
};

/** Parse .properties files */
function parseData(data) {
	var result = {};
	var parameters = data.split( /\n/ );
   
	for(var i=0; i<parameters.length; i++ ) {
		parameters[i] = parameters[i].replace( /^\s\s*/, '' ).replace( /\s\s*$/, '' ); // trim
       
		if(parameters[i].length > 0 && parameters[i].match("^#") != "#") { // skip comments
			var charIter = 0;
			while(charIter < parameters[i].length && parameters[i].charAt(charIter) != '=') {
				++charIter;
			}
			
			if(charIter == parameters[i].length) {
				continue;
			}
			
			var name = parameters[i].substring(0,charIter).trim();
			var value = parameters[i].substring(charIter+1).trim();
			result[name] = value;
       } 
   }
   
   return result;
}

function setGroup(groupDiv, checkElement) {
	var check = checkElement.checked;
	selectGroup(groupDiv, check);
}

function selectGroupInDiv(divName, check) {
	var div = document.getElementById(divName);
	selectGroup(div, check);
}

function selectGroup(groupDiv, check) {
	var inputs = groupDiv.getElementsByTagName('input');

	var checkboxes = [];

	for(var i=0; i < inputs.length; ++i) {
		if(inputs[i].type.toLowerCase() == 'checkbox') {
		    checkboxes.push(inputs[i]);
		}
	}

	checkAll(checkboxes,check);
}

function checkAll(checkboxes, check) {
	for(var i=0; i < checkboxes.length; ++i) {
		if(checkboxes[i].checked != check) {
			checkboxes[i].checked = check;
			checkboxes[i].onclick();
		}
	}
}

function showHideGroup(groupDiv, button) {
	button.checked = !button.checked;
	
	groupDiv.style.display = button.checked ? 'block' : 'none';
	button.className = "tree-button " + 
		(button.checked ? "button-collapse" : "button-expand");
}

function getAllTestsFields(properties) {
	var keysCounter = {};
	var tests = properties.tests;
	var testsAmount = tests.length;
	
	for (var i=0; i < tests.length; ++i) {
		for (var key in tests[i]) {
			if (!keysCounter[key]) {
				keysCounter[key]=0;
			}
			keysCounter[key]++;
		}
	}
	
	return keysCounter;
}

function $get(name) {
	return document.getElementById(name);
}
function isAllFieldsEmpty(fields) {
	for(var f in fields) {
		if (fields[f].value.length != 0) {
			return false;
		}
	}
	return true;
}

function loadSettingsFromPropertiesFile(propertiesFilePathTextBoxName, 
		enableFieldTextBoxName,
		groupByTextBoxName,
		showFieldsTextBoxName,
		multiplicityFieldTextBoxName,
		fieldSeparatorTextBoxName) {
	
	var fields = {
			enableFieldTextBox: $get(enableFieldTextBoxName),
			groupByTextBox: $get(groupByTextBoxName),
			showFieldsTextBox: $get(showFieldsTextBoxName),
			multiplicityFieldTextBox: $get(multiplicityFieldTextBoxName),
			fieldSeparatorTextBox: $get(fieldSeparatorTextBoxName)
		};
	var allEmpty=isAllFieldsEmpty(fields);
	
	fields.propertiesFilePathTextBox =  $get(propertiesFilePathTextBoxName);
	
	fields.filePath = fields.propertiesFilePathTextBox.value;
	
	var CONFIRM_MESSAGE = "This action will override all the properties you defined bellow.\nAre you sure you want to do this?";
	
	if(allEmpty || window.confirm(CONFIRM_MESSAGE)) {
		TestExecuterRPC.loadPropertiesFile(fields.filePath, function(t) {
			loadSettings(t.responseObject(), fields);
		});
	}
}

function setFieldBox(fieldBox, newValue) {
	var oldValue = fieldBox.value;
	fieldBox.value = (newValue && newValue.length > 0) ? newValue : oldValue;
	if(fieldBox.value != oldValue && fieldBox.onkeyup) {
		fieldBox.onkeyup();
	}
}

function loadSettings(propertiesFileContent, fields) {
	var properties = readPropertiesData(propertiesFileContent);
	parseProperties(properties);
	
	setFieldBox(fields.enableFieldTextBox, properties.enableField);
	setFieldBox(fields.groupByTextBox, properties.groupBy);
	setFieldBox(fields.showFieldsTextBox, properties.showFields);
	setFieldBox(fields.multiplicityFieldTextBox, properties.multiplicityField);
	setFieldBox(fields.fieldSeparatorTextBox, properties.fieldSeparator);
}

function getConfigFields(uuid) {
	return {
		propertiesFilePath: $get("propertiesFilePath_"+uuid),
		
		enableField: $get("enableField_"+uuid),
		groupBy: $get("groupBy_"+uuid),
		showFields: $get("showFields_"+uuid),
		multiplicityField: $get("multiplicityField_"+uuid),
		
		select: {
			enableField: $get("enableFieldSelect_"+uuid),
			groupBy: $get("groupBySelect_"+uuid),
			multiplicityField: $get("multiplicityFieldSelect_"+uuid)
		},
		
		fieldSeparator: $get("fieldSeparator_"+uuid),
		
		availableFields: $get("availableFields_"+uuid)
	};
}

function showHideAvailableFields(button, uuid) {
	button.checked = !button.checked;
	
	var fields = getConfigFields(uuid);
	
	if(button.checked) {
		button.value = "Hide Available Fields";
		var filePath =  fields.propertiesFilePath.value;

		TestExecuterRPC.loadPropertiesFile(filePath, function(t) {
			setAvailableFields(t.responseObject(), fields);
		});
	} else {
		button.value = "Show Available Fields";
		fields.availableFields.innerHTML = "";
		
		for(var select in fields.select) {
			fields.select[select].style.display="none";
		}
	}
}

function arrayToCommaSeperated(array) {
	var result = ""
		
	for(var i=0; i<array.length; ++i) {
		if(i != 0) {
			result += ", ";
		}
		
		result += array[i];
	}
	
	return result;
}

function setAvailableFields(propertiesFileContent, fields) {
	var properties = readPropertiesData(propertiesFileContent);
	parseProperties(properties);
	
	var availableFields = getAllTestsFields(properties);
	
	var fieldList = document.createElement('ul');
	fieldList.style.margin = "0px";
	
	for(var field in availableFields) {
		createFieldToShow(fieldList, fields, field, availableFields[field], 
				properties.tests.length);
	}
	
	fields.availableFields.appendChild(fieldList);
	
	for(var select in fields.select) {
		setSelectionOptions(fields.select[select], availableFields, fields[select].value);
		fields.select[select].style.display="inline";
	}
	
}

function setSelectionOptions(selectBox, availableFields, current) {
	selectBox.innerHTML = "";
	var selectIndex = 0;
	
	var firstOption = addOption(selectBox,"","--Select Field--", false);
	
	var hadSelected = false;
	
	for(var field in availableFields) {
		var selected = field == current;
		addOption(selectBox,field,field,selected);
		hadSelected = hadSelected || selected;
	}
	
	if(!hadSelected) {
		firstOption.selected = "selected";
	}
}

function addOption(container, value, title, isSelected) {
	var option = document.createElement('option');
	option.value = value;
	option.innerHTML = title;
	if(isSelected) {
		option.selected = "selected";
	}
	
	container.appendChild(option);
	
	return option;
}

function addToTextBoxList(fieldName, showFieldsTextBox) {
	var arr = commaSeperatedToArray(showFieldsTextBox.value);
	var index = arr.indexOf(fieldName);
	if(index < 0) {
		arr.push(fieldName);
		showFieldsTextBox.value = arrayToCommaSeperated(arr);
	}
}

function removeFromTextBoxList(fieldName, showFieldsTextBox) {
	var arr = commaSeperatedToArray(showFieldsTextBox.value);
	var index = arr.indexOf(fieldName);
	if(index > -1) {
		arr.splice(index, 1);
		showFieldsTextBox.value = arrayToCommaSeperated(arr);
	}
}

function createFieldToShow(fieldList, fields, fieldName, count, total) {
	var fieldItem = document.createElement('li');
	fieldItem.innerHTML = fieldName + " - ";
	
	var addLink = document.createElement('span');
	addLink.style.cursor = "pointer";
	addLink.style.color = "blue";
	addLink.innerHTML = "add";
	addLink.onclick = function() {
		addToTextBoxList(fieldName, fields.showFields);
	};
	
	var seperator = document.createElement('span');
	seperator.innerHTML = " / ";
	
	var removeLink = document.createElement('span');
	removeLink.style.cursor = "pointer";
	removeLink.style.color = "red";
	removeLink.innerHTML = "remove";
	removeLink.onclick = function() {
		removeFromTextBoxList(fieldName, fields.showFields);
	};
	
	var counter = document.createElement('span');
	counter.innerHTML = " ("+count+"/"+total+")";
	
	fieldItem.appendChild(addLink);
	fieldItem.appendChild(seperator);
	fieldItem.appendChild(removeLink);
	fieldItem.appendChild(counter);
	
	fieldList.appendChild(fieldItem);
}

function onPropertyChange(selectBoxName) {
	var selectBox = $get(selectBoxName);
	selectBox.selectedIndex = 0;
}