/**
 * Load a file from file system using RPC. On error, an alert will be shown. On
 * success, the callback function will be called.
 * 
 * @param filePath
 *            The path of the file in the file system.
 * @param callback
 *            A function that will be called on load success.
 */
function loadFileFromServer(filePath, callback) {
	TestExecuterRPC.loadPropertiesFile(filePath, function(t) {
		var res = t.responseObject();
		console.log(res);
		if (!res) {
			alert('Internal server error');
			return;
		}
		if (!res.success) {
			alert(res.errorMsg);
			return;
		}
		callback(res.content);
	});
}

/**
 * Load all tests from file. Build the tests tree and groups the tests. The
 * tests tree will be appended to testsTreeContainer. When tests are selected,
 * they will be written to selectedTestsTextBox. The parameters for building the
 * tree defined in the properties file and fields.
 * The tree UI consists of:
 * 	group checkbox - by clicking on this checkbox all the sub group will be
 * 		selected/unselected and will be added to the selectedTests variable. 
 * 		
 * 	test checbox - by clicking on this checkbox, the test will be added to
 * 		the selectedTests variable.
 * 		If by clicking on this checkbox all the group is marked, then the group
 * 		checkbox will be marked as well.
 * 		If by clicking on this checkbox all the group is not marked, then the
 * 		group checkbox will not be marked as well.
 * 	
 * 	multiplicity textbox - by entering a number the number will be added to
 * 		the appropriate test in the multiplicityField.
 *		If the value was not a number the textbox will be colored in red.
 *		If the value was 0 or not a number, then the number that will be saved
 *		will be 1.   
 * 
 * @param filePath
 *            The properties file path.
 * @param selectedTestsTextBoxName
 *            The name of the selectedTests textbox.
 * @param testsTreeContainerName
 *            The name of the testsTreeContainer div.
 * @param fields
 *            A JSON object containing the fields to override - enableField,
 *            groupBy, fieldSeparator, showFields, multiplicityField.
 */
function loadTreeFromFile(filePath, selectedTestsTextBoxName,
		testsTreeContainerName, fields) {
	if (filePath == null) {
		return;
	}

	fields.selectedTestsTextBox = $get(selectedTestsTextBoxName);
	fields.testsTreeContainer = $get(testsTreeContainerName);

	loadFileFromServer(filePath, function(content) {
		loadTreeFromProperties(content, fields);
	});
}

/**
 * For each field that exist in fields, it will override this field in
 * properties.
 * 
 * @param properties
 *            JSON object containing properties.
 * @param fields
 *            JSON object containing fields.
 */
function overrideSettings(properties, fields) {
	for ( var key in fields) {
		if (fields[key] != null) {
			properties[key] = fields[key];
		}
	}
}

/**
 * Load all tests from file. Build the tests tree and groups the tests. The
 * tests tree will be appended to testsTreeContainer. When tests are selected,
 * they will be written to selectedTestsTextBox. The parameters for building the
 * tree defined in the properties file and fields. testsTreeContainer and
 * selectedTestsTextBox defined in fields.
 * 
 * @param propertiesFileContent
 *            The content of the properties file.
 * @param fields
 *            A JSON object containing the fields to override - enableField,
 *            groupBy, fieldSeparator, showFields, multiplicityField.
 */
function loadTreeFromProperties(propertiesFileContent, fields) {
	if (propertiesFileContent == null) {
		fields.testsTreeContainer.innerHTML = "File not exist or could not open file";
		return;
	}

	if (propertiesFileContent.length == 0) {
		fields.testsTreeContainer.innerHTML = "File is empty";
		return;
	}

	var properties = readPropertiesData(propertiesFileContent);
	overrideSettings(properties, fields);

	parseProperties(properties);

	properties.testsTreeContainer = fields.testsTreeContainer;
	properties.selectedTestsTextBox = fields.selectedTestsTextBox;
	properties.selectedTests = {};

	// Add a test to the selected tests and commit (if dontCommit = false)
	properties.addSelectedTest = function(testIndex, dontCommit) {
		this.selectedTests[testIndex] = this.tests[testIndex];
		if (!dontCommit) {
			this.commitSelected();
		}
	};

	// Remove a test from the selected tests and commit (if dontCommit = false)
	properties.removeSelectedTest = function(testIndex, dontCommit) {
		delete this.selectedTests[testIndex];
		if (!dontCommit) {
			this.commitSelected();
		}
	};

	// Write the selected tests to selectedTestsTextBox
	properties.commitSelected = function() {
		var result = ""
		for ( var i in this.selectedTests) {
			if (result != "") {
				result += ",";
			}

			result += JSON.stringify(this.selectedTests[i]);
		}

		this.selectedTestsTextBox.value = "[" + result + "]";
	};

	loadTree(properties);
}

/**
 * Convert a list of elements as string to an array.
 * 
 * @param str
 *            String where the elements in it are separated by comma.
 * @returns {Array} Consists all the elements from the string.
 */
function commaSeperatedToArray(str) {
	if (!str) {
		return [];
	}

	var result = str.split(",");
	for (var i = 0; i < result.length; ++i) {
		result[i] = result[i].trim();
	}
	return result;
}

/**
 * Parse the tests (JSON string to JSON array).
 * Group the tests and add 2 fields:
 *  - groups: All available group names in the tests (sorted by name).
 *  - groupsMap: map group name to an array of tests.
 * Validate the rest of the fields and trim spaces if necessary.
 * 
 * @param properties
 *            The properties.
 */
function parseProperties(properties) {
	if (!properties.tests || properties.tests.length == 0) {
		properties.tests = [];
	} else {
		try {
			properties.tests = JSON.parse(properties.tests);
		} catch (error) {
			properties.tests = [];
			console.log(error);
			alert('Invalid tests property: ' + error.message);
		}
	}

	properties.showFields = commaSeperatedToArray(properties.showFields);

	if (!properties.enableField) {
		properties.enableField = "";
	} else {
		properties.enableField = properties.enableField.trim();
	}

	if (!properties.groupBy) {
		properties.groupBy = "";
	} else {
		properties.groupBy = properties.groupBy.trim();
	}

	if (!properties.fieldSeparator) {
		properties.fieldSeparator = "";
	} else {
		properties.fieldSeparator = properties.fieldSeparator.trim();
	}

	if (!properties.multiplicityField) {
		properties.multiplicityField = "";
	} else {
		properties.multiplicityField = properties.multiplicityField.trim();
	}

	properties.tests = properties.tests
			.sort(getTestComperator(properties.showFields));
	properties.groupsMap = getGroups(properties);
	properties.groups = getSortedGroups(properties.groupsMap);
}

/**
 * @param groupsMap
 *            A map of groups (name as key).
 * @returns {Array} Group names sorted by name.
 */
function getSortedGroups(groupsMap) {
	var groups = [];

	for ( var key in groupsMap) {
		groups.push(key);
	}

	groups.sort(function(a, b) {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	return groups;
}

/**
 * Groups the tests.
 * @param properties
 *            The properties.
 * @returns {Object} Map group names to tests array (contains only tests with
 *          enableField = true). If there is a tests that doesn't have the
 *          property groupBy it will be in "UNGROUPED" group.
 */
function getGroups(properties) {
	var result = {};
	var tests = properties.tests;

	for (var i = 0; i < tests.length; ++i) {
		var test = tests[i];
		var enabledField = test[properties.enableField];

		var enabled = true;
		if (enabledField) {
			enabled = Boolean(test[properties.enableField]);
		}

		if (!enabled) {
			continue;
		}

		var key = test[properties.groupBy];
		if (!key) {
			key = "UNGROUPED";
		}

		if (!result[key]) {
			result[key] = {};
		}

		result[key][i] = test;
	}

	return result;
}

/**
 * Renders the tree to treeContainer
 * 
 * @param properties
 *            The properties
 */
function loadTree(properties) {
	// These are the fields in properties:
	// testsArray, enableField, groupBy, fieldSeparator, showFields

	for (var i = 0; i < properties.groups.length; ++i) {
		var groupName = properties.groups[i];
		var groupTests = properties.groupsMap[groupName];

		createGroup(groupName, groupTests, properties);
	}

	properties.commitSelected();
}

/**
 * Create a group of tests for the tree and add it to the tree.
 * 
 * @param groupName
 *            The name of the group
 * @param groupTests
 *            The tests belong to this group (array)
 * @param properties
 *            The properties
 */
function createGroup(groupName, groupTests, properties) {
	var groupDiv = document.createElement('div');
	groupDiv.className = "group";
	groupDiv.setAttribute("name", groupName);

	var plusButton = document.createElement('span');
	plusButton.className = "tree-button button-expand";
	plusButton.checked = false;
	plusButton.onclick = function() {
		showHideGroup(groupDiv, plusButton);
	};

	var groupCheck = document.createElement('input');
	groupCheck.type = "checkbox";
	groupCheck.setAttribute("name", groupName);
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
		selectedCounter : 0,
		size : Object.keys(groupTests).length,
		inc : function() {
			++this.selectedCounter;
			this.refreshState();
		},
		dec : function() {
			--this.selectedCounter;
			this.refreshState();
		},
		refreshState : function() {
			groupCheck.checked = this.selectedCounter == this.size;
		}
	};

	for ( var i in groupTests) {
		createTest(groupDiv, groupTests[i], i, groupState, properties);
	}

	properties.testsTreeContainer.appendChild(groupDiv);
}

/**
 * Convert multiplicity value from string to integer.
 * 
 * @param value
 *            {String} Multiplicity value
 * @returns {Integer} Multiplicity value. returns 0, if the value in not a
 *          number or smaller then 0.
 */
function getMultiplicityAsInt(value) {
	var asNumber = Number(value);
	if (isNaN(asNumber) || asNumber < 1) {
		return 0;
	}

	return parseInt(asNumber);
}

/**
 * Create a test for a group in the tree and add it to the group in the tree.
 * 
 * @param groupContainer
 *            The group container (div).
 * @param test
 *            The test object.
 * @param testIndex
 *            The index of the test in the group array.
 * @param groupState
 *            An object allowing changing the group state (selected/unselected).
 * @param properties
 *            The properties.
 */
function createTest(groupContainer, test, testIndex, groupState, properties) {
	var testCheck = document.createElement('input');
	testCheck.type = "checkbox";
	testCheck.checked = true;

	var testName = getShowString(test, properties);

	testCheck.setAttribute("name", testName);

	testCheck.onclick = function(event) {
		if (testCheck.checked) {
			groupState.inc();
		} else {
			groupState.dec();
		}

		selectTest(testIndex, event ? false : true, testCheck.checked,
				properties);
	};

	if (testCheck.checked) {
		groupState.inc();
		selectTest(testIndex, true, testCheck.checked, properties);
	}

	var currentMulti = getMultiplicityAsInt(test[properties.multiplicityField]);

	if (currentMulti < 1) {
		test[properties.multiplicityField] = 1;
	}

	var multi = document.createElement('input');
	multi.value = test[properties.multiplicityField];
	multi.type = "text";
	multi.className = "multiplicityInput";
	multi.style.backgroundColor = "#FFF";

	multi.onchange = function() {
		var input = getMultiplicityAsInt(multi.value);

		if (input < 1) {
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

/**
 * Add/Remove test from selected tests.
 * 
 * @param testIndex
 *            The test index in the group array.
 * @param dontCommit
 *            Commit the changes if false.
 * @param select
 *            If true then add. Otherwise, remove.
 * @param properties
 *            The properties.
 */
function selectTest(testIndex, dontCommit, select, properties) {
	if (select) {
		properties.addSelectedTest(testIndex, dontCommit);
	} else {
		properties.removeSelectedTest(testIndex, dontCommit);
	}
}

/**
 * @param test
 *            The current test object.
 * @param properties
 *            The properties.
 * @returns {String} Containing the fields the user wanted to see
 *          separated by the separator he chose, for the current test.
 */
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

/**
 * @param fieldsToShow
 *            The fields that will be shown in the tree.
 * @returns {Function} a compare function to use for the getSortedGroups
 *          function.
 */
function getTestComperator(fieldsToShow) {
	return function compareTest(test1, test2) {
		for (var i = 0; i < fieldsToShow.length; ++i) {
			var fieldValue1 = test1[fieldsToShow[i]], fieldValue2 = test2[fieldsToShow[i]];

			if (fieldValue1 != null && fieldValue2 != null) {
				if (fieldValue1 == fieldValue2) {
					continue;
				} else {
					return fieldValue1.toLowerCase().localeCompare(
							fieldValue2.toLowerCase());
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

/**
 * Parse .properties files
 * 
 * @param data
 *            The properties file content.
 * @returns {Object} Key/Value map of the properties.
 */
function readPropertiesData(data) {
	var result = {};
	var parameters = data.split(/\n/);

	for (var i = 0; i < parameters.length; i++) {
		parameters[i] = parameters[i].replace(/^\s\s*/, '').replace(/\s\s*$/,
				''); // trim

		if (parameters[i].length > 0 && parameters[i].match("^#") != "#") { // skip
			// comments
			var charIter = 0;
			while (charIter < parameters[i].length
					&& parameters[i].charAt(charIter) != '=') {
				++charIter;
			}

			if (charIter == parameters[i].length) {
				continue;
			}

			var name = parameters[i].substring(0, charIter).trim();
			var value = parameters[i].substring(charIter + 1).trim();
			result[name] = value;
		}
	}

	return result;
}

/**
 * Set the state of a group (selected/unselected).
 * 
 * @param groupDiv
 *            The div containing the group.
 * @param checkElement
 *            true for select. false for unselect.
 */
function setGroup(groupDiv, checkElement) {
	var check = checkElement.checked;
	selectGroup(groupDiv, check);
}

/**
 * Select/Unselect all the tests in a group.
 * 
 * @param groupDiv
 *            The div containing the group.
 * @param check
 *            true for select. false for unselect.
 */
function selectGroup(groupDiv, check) {
	var inputs = groupDiv.getElementsByTagName('input');

	var checkboxes = [];

	for (var i = 0; i < inputs.length; ++i) {
		if (inputs[i].type.toLowerCase() == 'checkbox') {
			checkboxes.push(inputs[i]);
		}
	}

	checkAll(checkboxes, check);
}

/**
 * Select/Unselect all the tests in a group.
 * 
 * @param divName
 *            The div name containing the group.
 * @param check
 *            true for select. false for unselect.
 */
function selectGroupInDiv(divName, check) {
	var div = document.getElementById(divName);
	selectGroup(div, check);
}

/**
 * Check/Uncheck all checkboxes
 * 
 * @param checkboxes
 *            {Array} Checkboxes
 * @param check
 *            true for check. false for uncheck.
 */
function checkAll(checkboxes, check) {
	for (var i = 0; i < checkboxes.length; ++i) {
		if (checkboxes[i].checked != check) {
			checkboxes[i].checked = check;
			checkboxes[i].onclick();
		}
	}
}

/**
 * Switch the visibility of the tests of a group.
 * 
 * @param groupDiv
 *            A div containing the group to show/hide.
 * @param button
 *            The +/- button for the group.
 */
function showHideGroup(groupDiv, button) {
	button.checked = !button.checked;

	groupDiv.style.display = button.checked ? 'block' : 'none';
	button.className = "tree-button "
			+ (button.checked ? "button-collapse" : "button-expand");
}

/**
 * @param properties
 *            The properties.
 * @returns {Object} Key/Value map of all fields exists in the tests property,
 *          mapped to the amount of tests it appears in.
 */
function getAllTestsFields(properties) {
	var keysCounter = {};
	var tests = properties.tests;
	var testsAmount = tests.length;

	for (var i = 0; i < tests.length; ++i) {
		for ( var key in tests[i]) {
			if (!keysCounter[key]) {
				keysCounter[key] = 0;
			}
			keysCounter[key]++;
		}
	}

	return keysCounter;
}

/**
 * @param name
 *            The name of the textbox.
 * @returns The actual DOM element.
 */
function $get(name) {
	return document.getElementById(name);
}

/**
 * @param fields
 *            The fields that appears in the override section (from the
 *            configuration UI).
 * @returns {Boolean} true if all empty.
 */
function isAllFieldsEmpty(fields) {
	for ( var f in fields) {
		if (fields[f].value.length != 0) {
			return false;
		}
	}
	return true;
}

/**
 * Sets all override fields with the fields from the properties file.
 * Will show alert if at least one textbox isn't empty.
 * 
 * @param propertiesFilePathTextBoxName
 * @param enableFieldTextBoxName
 * @param groupByTextBoxName
 * @param showFieldsTextBoxName
 * @param multiplicityFieldTextBoxName
 * @param fieldSeparatorTextBoxName
 */
function loadSettingsFromPropertiesFile(propertiesFilePathTextBoxName,
		enableFieldTextBoxName, groupByTextBoxName, showFieldsTextBoxName,
		multiplicityFieldTextBoxName, fieldSeparatorTextBoxName) {

	var fields = {
		enableFieldTextBox : $get(enableFieldTextBoxName),
		groupByTextBox : $get(groupByTextBoxName),
		showFieldsTextBox : $get(showFieldsTextBoxName),
		multiplicityFieldTextBox : $get(multiplicityFieldTextBoxName),
		fieldSeparatorTextBox : $get(fieldSeparatorTextBoxName)
	};
	var allEmpty = isAllFieldsEmpty(fields);

	fields.propertiesFilePathTextBox = $get(propertiesFilePathTextBoxName);

	fields.filePath = fields.propertiesFilePathTextBox.value;

	var CONFIRM_MESSAGE = "This action will override some (or all) of the properties you defined bellow.\nAre you sure you want to do this?";

	if (allEmpty || window.confirm(CONFIRM_MESSAGE)) {
		loadFileFromServer(fields.filePath, function(content) {
			loadSettings(content, fields);
		});
	}
}

/**
 * Set a textbox with a new value if the new value isn't empty. If the value
 * changes it will call onkeyup().
 * 
 * @param fieldBox
 *            The textbox DOM element.
 * @param newValue
 *            {String} The new value.
 */
function setFieldBox(fieldBox, newValue) {
	var oldValue = fieldBox.value;
	fieldBox.value = (newValue && newValue.length > 0) ? newValue : oldValue;
	if (fieldBox.value != oldValue && fieldBox.onkeyup) {
		fieldBox.onkeyup();
	}
}

/**
 * Sets all override fields with the fields from the properties file.
 * 
 * @param propertiesFileContent
 *            The properties file content.
 * @param fields
 *            All fields.
 */
function loadSettings(propertiesFileContent, fields) {
	var properties = readPropertiesData(propertiesFileContent);
	parseProperties(properties);

	setFieldBox(fields.enableFieldTextBox, properties.enableField);
	setFieldBox(fields.groupByTextBox, properties.groupBy);
	setFieldBox(fields.showFieldsTextBox, properties.showFields);
	setFieldBox(fields.multiplicityFieldTextBox, properties.multiplicityField);
	setFieldBox(fields.fieldSeparatorTextBox, properties.fieldSeparator);
}

/**
 * Get all the fields of the configuration UI based on uuid.
 * 
 * @param uuid
 *            The TextExecuter UUID
 * @returns {Object} The configuratio fields as Key/Value map.
 */
function getConfigFields(uuid) {
	return {
		propertiesFilePath : $get("propertiesFilePath_" + uuid),

		enableField : $get("enableField_" + uuid),
		groupBy : $get("groupBy_" + uuid),
		showFields : $get("showFields_" + uuid),
		multiplicityField : $get("multiplicityField_" + uuid),

		select : {
			enableField : $get("enableFieldSelect_" + uuid),
			groupBy : $get("groupBySelect_" + uuid),
			multiplicityField : $get("multiplicityFieldSelect_" + uuid)
		},

		fieldSeparator : $get("fieldSeparator_" + uuid),

		availableFields : $get("availableFields_" + uuid)
	};
}

/**
 * Toggle Show/Hide the available fields next to the relavent textboxes in the
 * configuration UI. When showing the fields, it will load them from the
 * properties file entered in the UI.
 * 
 * @param button
 *            The button DOM element.
 * @param uuid
 *            The TestExecuter UUID.
 */
function showHideAvailableFields(button, uuid) {
	button.checked = !button.checked;

	var fields = getConfigFields(uuid);

	if (button.checked) {
		button.value = "Hide Available Fields";
		var filePath = fields.propertiesFilePath.value;

		loadFileFromServer(filePath, function(content) {
			setAvailableFields(content, fields);
		});
	} else {
		button.value = "Show Available Fields";
		fields.availableFields.innerHTML = "";

		for ( var select in fields.select) {
			fields.select[select].style.display = "none";
		}
	}
}

/**
 * Convert an array of strings to a comma separated list.
 * 
 * @param array
 *            Array of strings.
 * @returns {String} A comma separated list.
 */
function arrayToCommaSeperated(array) {
	var result = ""

	for (var i = 0; i < array.length; ++i) {
		if (i != 0) {
			result += ", ";
		}

		result += array[i];
	}

	return result;
}

/**
 * Show the available fields next to the relavent textboxes in the configuration
 * UI.
 * 
 * @param propertiesFileContent
 *            The properties file content.
 * @param fields
 *            The fields.
 */
function setAvailableFields(propertiesFileContent, fields) {
	var properties = readPropertiesData(propertiesFileContent);
	parseProperties(properties);

	var availableFields = getAllTestsFields(properties);

	var fieldList = document.createElement('ul');
	fieldList.style.margin = "0px";

	for ( var field in availableFields) {
		createFieldToShow(fieldList, fields, field, availableFields[field],
				properties.tests.length);
	}

	fields.availableFields.appendChild(fieldList);

	for ( var select in fields.select) {
		setSelectionOptions(fields.select[select], availableFields,
				fields[select].value);
		fields.select[select].style.display = "inline";
	}

}

/**
 * Add selection options for a select field.
 * 
 * @param selectBox
 *            The select box DOM element.
 * @param availableFields
 *            All the fields available.
 * @param current
 *            The current text entered in the textbox relavet to this select box.
 */
function setSelectionOptions(selectBox, availableFields, current) {
	selectBox.innerHTML = "";
	var selectIndex = 0;

	var firstOption = addOption(selectBox, "", "--Select Field--", false);

	var hadSelected = false;

	for ( var field in availableFields) {
		var selected = field == current;
		addOption(selectBox, field, field, selected);
		hadSelected = hadSelected || selected;
	}

	if (!hadSelected) {
		firstOption.selected = "selected";
	}
}

/**
 * Add an option to a select box.
 * 
 * @param container
 *            The select box DOM element.
 * @param value
 *            The value of the option to add.
 * @param title
 *            The title of the option to add.
 * @param isSelected
 *            Is this option should be selected.
 * @returns {DOM element} The DOM element of the option.
 */
function addOption(container, value, title, isSelected) {
	var option = document.createElement('option');
	option.value = value;
	option.innerHTML = title;
	if (isSelected) {
		option.selected = "selected";
	}

	container.appendChild(option);

	return option;
}

/**
 * Add item to a comma separeted list in a textbox.
 * 
 * @param fieldName
 *            The field to add to the list.
 * @param showFieldsTextBox
 *            The textbox containing the list.
 */
function addToTextBoxList(fieldName, showFieldsTextBox) {
	var arr = commaSeperatedToArray(showFieldsTextBox.value);
	var index = arr.indexOf(fieldName);
	if (index < 0) {
		arr.push(fieldName);
		showFieldsTextBox.value = arrayToCommaSeperated(arr);
	}
}

/**
 * Remove item from a comma separeted list in a textbox.
 * 
 * @param fieldName
 *            The field to remove from the list.
 * @param showFieldsTextBox
 *            The textbox containing the list.
 */
function removeFromTextBoxList(fieldName, showFieldsTextBox) {
	var arr = commaSeperatedToArray(showFieldsTextBox.value);
	var index = arr.indexOf(fieldName);
	if (index > -1) {
		arr.splice(index, 1);
		showFieldsTextBox.value = arrayToCommaSeperated(arr);
	}
}

/**
 * Create a list item for the available fields to show. Next to each field will
 * appear the amount of tests it appears in and an option to add/remove it from
 * the list.
 * 
 * @param fieldList
 *            The container of the fields.
 * @param fields
 *            The fields
 * @param fieldName
 *            The fields to create list item for.
 * @param count
 *            The amount of times this field appear in the tests.
 * @param total
 *            The total amount of tests available.
 */
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
	counter.innerHTML = " (" + count + "/" + total + ")";

	fieldItem.appendChild(addLink);
	fieldItem.appendChild(seperator);
	fieldItem.appendChild(removeLink);
	fieldItem.appendChild(counter);

	fieldList.appendChild(fieldItem);
}

/**
 * On textbox edit, we need to update the relavent select box to show the
 * default option.
 * 
 * @param selectBoxName
 *            The select box name.
 */
function onPropertyChange(selectBoxName) {
	var selectBox = $get(selectBoxName);
	selectBox.selectedIndex = 0;
}