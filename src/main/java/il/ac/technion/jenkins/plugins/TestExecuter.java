// Even a warning example, is an example. :-X

package il.ac.technion.jenkins.plugins;

import hudson.Extension;
import hudson.model.ParameterValue;
import hudson.model.SimpleParameterDefinition;
import hudson.model.Hudson;
import hudson.model.StringParameterValue;
import hudson.util.IOUtils;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.UUID;

import net.sf.json.JSONObject;

import org.kohsuke.stapler.DataBoundConstructor;
import org.kohsuke.stapler.StaplerRequest;
import org.kohsuke.stapler.bind.JavaScriptMethod;


public class TestExecuter extends SimpleParameterDefinition {
	private final String uuid = UUID.randomUUID().toString();
	
	private final String propertiesFilePath;
	
	private final OverrideSettingBlock enableField;
	private final OverrideSettingBlock groupBy;
	private final OverrideSettingBlock fieldSeparator;
	private final OverrideSettingBlock showFields;
	private final OverrideSettingBlock multiplicityField;
	
	@DataBoundConstructor
	public TestExecuter(String name, String description,
			String propertiesFilePath, OverrideSettingBlock enableField,
			OverrideSettingBlock groupBy, OverrideSettingBlock fieldSeparator,
			OverrideSettingBlock showFields, OverrideSettingBlock multiplicityField) {

		super(name, description);
		this.propertiesFilePath = propertiesFilePath;

		this.enableField = enableField;
		this.groupBy = groupBy;
		this.fieldSeparator = fieldSeparator;
		this.showFields = showFields;
		this.multiplicityField = multiplicityField;
	}
	
	public String getAsJson() {
		return "{" +
			"enableField:" + (enableField == null ? "null" : '"' + enableField.text + '"') +
			",groupBy:" + (groupBy == null ? "null" : '"' + groupBy.text + '"') +
			",fieldSeparator:" + (fieldSeparator == null ? "null" : '"' + fieldSeparator.text + '"') +
			",showFields:" + (showFields == null ? "null" : '"' + showFields.text + '"') +
			",multiplicityField:" + (multiplicityField == null ? "null" : '"' + multiplicityField.text + '"') +
		"}";
	}
	
	public static class OverrideSettingBlock {
		public final String text;
		
		@DataBoundConstructor
		public OverrideSettingBlock(String text) {
			this.text = text;
		}
	}

	public String getUuid() {
		return uuid;
	}
	
	public String getPropertiesFilePath() {
		return propertiesFilePath;
	}


	public OverrideSettingBlock getEnableField() {
		return enableField;
	}

	public OverrideSettingBlock getGroupBy() {
		return groupBy;
	}

	public OverrideSettingBlock getFieldSeparator() {
		return fieldSeparator;
	}

	public OverrideSettingBlock getShowFields() {
		return showFields;
	}

	public OverrideSettingBlock getMultiplicityField() {
		return multiplicityField;
	}	

	// Overridden for better type safety.
	@Override
	public DescriptorImpl getDescriptor() {
		return (DescriptorImpl) Hudson.getInstance().getDescriptor(getClass());
	}
	
	public static class ReadFileResponse {
		public ReadFileResponse(boolean success, String errorMsg,
				String content) {
			super();
			this.success = success;
			this.errorMsg = errorMsg;
			this.content = content;
		}
		public boolean success;
		public String errorMsg;
		public String content;
	}
	
	@Extension
	// This indicates to Jenkins that this is an implementation of an extension
	// point.
	public static final class DescriptorImpl extends ParameterDescriptor {
		// This human readable name is used in the configuration screen.
		public String getDisplayName() {
			return "Choosing Tests";
		}
		
		
		@JavaScriptMethod
		public static ReadFileResponse loadPropertiesFile(String filePath) {
			// load a properties file from class path, inside static method
			if(filePath == null || filePath.isEmpty()) {
				return new ReadFileResponse(false, "Invalid file name", null);
			}
			
			File file = new File(filePath);
			
			if(!file.exists()) {
				return new ReadFileResponse(false, "File doesn't exist OR Jenkins doesn't have permission for this file", null);
			}
			
			if(!file.isFile()) {
				return new ReadFileResponse(false, "Not a file", null);
			}
						
			try {
				FileInputStream inputStream = new FileInputStream(file.getPath());
				return new ReadFileResponse(true, null, IOUtils.toString(inputStream, "UTF-8"));
			} catch (IOException e) {
				return new ReadFileResponse(false, "Could not access file: "+e.getMessage(), null);
			}
		}
	}

	@Override
	public ParameterValue createValue(String value) {
		return new StringParameterValue(getName(), value, getDescription());
	}

	@Override
	public ParameterValue createValue(StaplerRequest req,
			JSONObject jo) {
		return createValue(jo.getString("selectedTests"));
	}
	
	@JavaScriptMethod
	public ReadFileResponse loadPropertiesFile(String filePath) {
		return DescriptorImpl.loadPropertiesFile(filePath);
	}
}
